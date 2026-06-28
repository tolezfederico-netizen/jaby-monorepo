import { useState } from "react";
import {
  useOrders,
  useUpdateOrderStatus,
  useDeleteOrder,
} from "../hooks/useOrders";
import type { OrderWithItemsType } from "../hooks/useOrders";
import type { OrderStatusType } from "@jaby/shared";
import ConfirmModal from "../components/ConfirmModal";
import { formatPrice } from "@jaby/shared";
import styles from "./OrdersPage.module.css";

const STATUS_LABELS: Record<OrderStatusType, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  in_progress: "En curso",
  completed: "Completado",
};

function getNextStatus(
  status: OrderStatusType,
  modality: 'pickup' | 'delivery'
): OrderStatusType | null {
  if (modality === 'delivery') {
    const map: Partial<Record<OrderStatusType, OrderStatusType>> = {
      pending: 'confirmed',
      confirmed: 'in_progress',
      in_progress: 'completed',
    }
    return map[status] ?? null
  }
  const map: Partial<Record<OrderStatusType, OrderStatusType>> = {
    pending: 'confirmed',
    confirmed: 'completed',
  }
  return map[status] ?? null
}

function getNextLabel(
  status: OrderStatusType,
  modality: 'pickup' | 'delivery'
): string | null {
  if (modality === 'delivery') {
    const map: Partial<Record<OrderStatusType, string>> = {
      pending: 'Confirmar pedido',
      confirmed: 'Poner en curso',
      in_progress: 'Marcar completado',
    }
    return map[status] ?? null
  }
  const map: Partial<Record<OrderStatusType, string>> = {
    pending: 'Confirmar pedido',
    confirmed: 'Marcar listo para retirar',
  }
  return map[status] ?? null
}

function getWaUrl(
  status: OrderStatusType,
  modality: 'pickup' | 'delivery',
  name: string,
  phone: string
): string | null {
  let text: string | null = null
  if (modality === 'delivery') {
    if (status === 'confirmed') {
      text = `¡Hola ${name}! Tu pedido fue *confirmado* y ya lo estamos preparando. ¡Gracias por elegirnos!`
    } else if (status === 'in_progress') {
      text = `¡Hola ${name}! Tu pedido está *en camino*. Te avisamos cuando esté listo para entregar.`
    }
  } else {
    if (status === 'confirmed') {
      text = `¡Hola ${name}! Tu pedido fue *recibido con éxito* y ya lo estamos preparando. Te avisamos cuando esté listo para que pases a buscarlo.`
    } else if (status === 'completed') {
      text = `¡Hola ${name}! Tu pedido está *listo para retirar*. ¡Te esperamos!`
    }
  }
  if (!text) return null
  return `https://wa.me/54${phone}?text=${encodeURIComponent(text)}`
}

type FilterStatus = OrderStatusType | "all";
type FilterModality = "all" | "pickup" | "delivery";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

interface OrderCardProps {
  order: OrderWithItemsType;
  isSelected: boolean;
  onClick: () => void;
}

function OrderCard({ order, isSelected, onClick }: OrderCardProps) {
  return (
    <div
      className={`${styles.card} ${styles[`card_${order.status}`]} ${isSelected ? styles.cardSelected : ""}`}
      onClick={onClick}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.orderNumber}>
            #{String(order.order_number).padStart(4, "0")}
          </span>
          <span
            className={`${styles.statusBadge} ${styles[`badge_${order.status}`]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
          <span className={styles.modality}>
            {order.modality === "delivery" ? "🚗 Delivery" : "🏪 Retiro"}
          </span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <span className={styles.customerName}>{order.customer_name}</span>
        {order.customer_address && (
          <span className={styles.address}>{order.customer_address}</span>
        )}
        <div className={styles.cardBodyRight}>
          <span className={styles.createdAt}>
            {formatDate(order.created_at)}
          </span>
          <span className={styles.timeAgo}>{timeAgo(order.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

interface OrderDetailPanelProps {
  order: OrderWithItemsType | null;
  onStatusChange: (
    id: string,
    status: OrderStatusType,
    order: OrderWithItemsType,
  ) => void;
  onDelete: (order: OrderWithItemsType) => void;
  onClose: () => void;
  isPending: boolean;
  isPanelOpen: boolean;
}

function OrderDetailPanel({
  order,
  onStatusChange,
  onDelete,
  onClose,
  isPending,
  isPanelOpen,
}: OrderDetailPanelProps) {
  if (!order) {
    return (
      <div
        className={`${styles.panel} ${isPanelOpen ? styles.panelVisible : ""}`}
      >
        <div className={styles.panelEmpty}>
          <span className={styles.panelEmptyIcon}>📋</span>
          <p className={styles.panelEmptyTitle}>Ningún pedido seleccionado</p>
          <p className={styles.panelEmptyDesc}>
            Seleccioná un pedido de la lista para ver su detalle.
          </p>
        </div>
      </div>
    );
  }

  const nextStatus = getNextStatus(order.status, order.modality);
  const nextLabel = getNextLabel(order.status, order.modality);

  return (
    <div
      className={`${styles.panel} ${isPanelOpen ? styles.panelVisible : ""}`}
    >
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderLeft}>
          <span className={styles.panelOrderNumber}>
            #{String(order.order_number).padStart(4, "0")}
          </span>
          <span
            className={`${styles.statusBadge} ${styles[`badge_${order.status}`]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <button className={styles.deleteButton} onClick={() => onDelete(order)}>
          Eliminar
        </button>
        <button className={styles.panelCloseBtn} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>Cliente</span>
          <span className={styles.panelValue}>{order.customer_name}</span>
          {order.customer_address && (
            <span className={styles.panelSubValue}>
              {order.customer_address}
            </span>
          )}
          {order.customer_phone && (
            <span className={styles.panelSubValue}>
              📱 {order.customer_phone}
            </span>
          )}
        </div>

        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>Modalidad</span>
          <span className={styles.panelValue}>
            {order.modality === "delivery"
              ? "🚗 Delivery"
              : "🏪 Retiro en local"}
          </span>
        </div>

        {order.notes && (
          <div className={styles.panelSection}>
            <span className={styles.panelLabel}>Notas</span>
            <span className={styles.panelValue}>{order.notes}</span>
          </div>
        )}

        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>Productos</span>
          <ul className={styles.itemsList}>
            {(order.order_items ?? []).map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.itemName}>
                  {item.quantity}x {item.product_name}
                </span>
                <span className={styles.itemSubtotal}>
                  {formatPrice(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          {order.modality === "delivery" && (
            <div className={styles.totalRow}>
              <span>Envío</span>
              <span>
                {order.delivery_cost != null && order.delivery_cost > 0
                  ? formatPrice(order.delivery_cost)
                  : "A confirmar"}
              </span>
            </div>
          )}
          <div className={`${styles.totalRow} ${styles.totalRowFinal}`}>
            <span>Total</span>
            <span>{formatPrice(order.total + (order.delivery_cost ?? 0))}</span>
          </div>
        </div>

        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>Historial</span>
          <div className={styles.timestamps}>
            <div className={styles.timestampRow}>
              <span className={styles.timestampDot} />
              <span>Creado: {formatDate(order.created_at)}</span>
            </div>
            {order.confirmed_at && (
              <div className={styles.timestampRow}>
                <span
                  className={`${styles.timestampDot} ${styles.timestampDotConfirmed}`}
                />
                <span>Confirmado: {formatDate(order.confirmed_at)}</span>
              </div>
            )}
            {order.completed_at && (
              <div className={styles.timestampRow}>
                <span
                  className={`${styles.timestampDot} ${styles.timestampDotCompleted}`}
                />
                <span>Completado: {formatDate(order.completed_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {nextStatus && nextLabel && (
        <div className={styles.panelFooter}>
          <button
            className={styles.actionButton}
            onClick={() => onStatusChange(order.id, nextStatus, order)}
            disabled={isPending}
          >
            {isPending ? "Guardando..." : nextLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterModality, setFilterModality] = useState<FilterModality>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithItemsType | null>(
    null,
  );
  const [pendingWaUrl, setPendingWaUrl] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const allOrders = orders ?? [];

  const countByStatus = (status: OrderStatusType) =>
    allOrders.filter((o) => o.status === status).length;

  const filtered = allOrders.filter((o) => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (filterModality !== "all" && o.modality !== filterModality) return false;
    return true;
  });

  const selectedOrder = selectedOrderId
    ? ((orders ?? []).find((o) => o.id === selectedOrderId) ?? null)
    : null;

  const handleStatusChange = (
    id: string,
    status: OrderStatusType,
    order: OrderWithItemsType,
  ) => {
    if (updateStatus.isPending) return;
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => {
          if (order.customer_phone) {
            const url = getWaUrl(status, order.modality, order.customer_name, order.customer_phone);
            if (url) setPendingWaUrl(url);
          }
        },
        onError: () => {
          console.error('Error al actualizar el estado del pedido', id);
        },
      },
    );
  };

  const handleDeleteRequest = (order: OrderWithItemsType) =>
    setOrderToDelete(order);
  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    try {
      await deleteOrder.mutateAsync(orderToDelete.id);
      if (selectedOrderId === orderToDelete.id) setSelectedOrderId(null);
      setOrderToDelete(null);
    } catch {
      console.error('Error al eliminar el pedido', orderToDelete.id);
      setOrderToDelete(null);
    }
  };
  const handleDeleteCancel = () => setOrderToDelete(null);

  const handleWaConfirm = () => {
    if (pendingWaUrl) window.open(pendingWaUrl, '_blank');
    setPendingWaUrl(null);
  };

  const handleWaCancel = () => setPendingWaUrl(null);

  return (
    <div className={styles.page}>
      <div className={styles.listColumn}>
        <h1 className={styles.title}>Pedidos</h1>

        <div className={styles.filtersWrapper}>
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Estado</span>
            <div className={styles.filterGroup}>
              <button
                className={`${styles.filterBtn} ${filterStatus === "all" ? styles.filterBtnActive : ""}`}
                onClick={() => setFilterStatus("all")}
              >
                Todos
                <span className={styles.filterCount}>{allOrders.length}</span>
              </button>
              {(
                ["pending", "confirmed", "in_progress", "completed"] as const
              ).map((s) => (
                <button
                  key={s}
                  className={`${styles.filterBtn} ${filterStatus === s ? styles.filterBtnActive : ""}`}
                  onClick={() => setFilterStatus(s)}
                >
                  {STATUS_LABELS[s]}
                  <span className={styles.filterCount}>{countByStatus(s)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterDivider} />

          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Modalidad</span>
            <div className={styles.filterGroup}>
              {(["all", "pickup", "delivery"] as const).map((m) => (
                <button
                  key={m}
                  className={`${styles.filterBtn} ${filterModality === m ? styles.filterBtnActive : ""}`}
                  onClick={() => setFilterModality(m)}
                >
                  {m === "all"
                    ? "Todas"
                    : m === "pickup"
                      ? "Retiro"
                      : "Delivery"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className={styles.loadingText}>Cargando pedidos...</p>
        ) : filtered.length === 0 ? (
          <p className={styles.emptyText}>No hay pedidos con estos filtros.</p>
        ) : (
          <div className={styles.list}>
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isSelected={selectedOrder?.id === order.id}
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setIsPanelOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {isPanelOpen && (
        <div
          className={styles.panelOverlay}
          onClick={() => setIsPanelOpen(false)}
        />
      )}
      <OrderDetailPanel
        order={selectedOrder}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteRequest}
        isPending={updateStatus.isPending}
        onClose={() => setIsPanelOpen(false)}
        isPanelOpen={isPanelOpen}
      />

      {orderToDelete && (
        <ConfirmModal
          title="Eliminar pedido"
          message={`¿Eliminar el pedido #${String(orderToDelete.order_number).padStart(4, "0")} de ${orderToDelete.customer_name}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isDanger={true}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {pendingWaUrl && (
        <ConfirmModal
          title="Notificar al cliente"
          message="¿Querés enviarle un mensaje de WhatsApp al cliente avisándole del cambio?"
          confirmLabel="Sí, notificar"
          cancelLabel="No"
          isDanger={false}
          onConfirm={handleWaConfirm}
          onCancel={handleWaCancel}
        />
      )}
    </div>
  );
}

export default OrdersPage;
