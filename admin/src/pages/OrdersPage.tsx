import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  RECENT_ORDERS_DAYS,
  useArchivedOrders,
  useOlderOrders,
  useOrderCounts,
  useOrders,
  useUpdateOrderStatus,
  useDeleteOrder,
  useArchiveOrder,
} from "../hooks/useOrders";
import type { OrderWithItemsType } from "../hooks/useOrders";
import type { OrderStatusType } from "@jaby/shared";
import ConfirmModal from "../components/ConfirmModal";
import { useProducts } from "../hooks/useProducts";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PhoneIcon,
  PinIcon,
  ProductsIcon,
  ScooterIcon,
  StoreIcon,
  TrashIcon,
  WhatsAppIcon,
} from "../components/icons";
import { formatPrice, toWhatsAppNumber } from "@jaby/shared";
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
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`
}

type FilterStatus = OrderStatusType | "all" | "archived";
type FilterModality = "all" | "pickup" | "delivery";

const ORDER_STATUSES = ["pending", "confirmed", "in_progress", "completed"] as const;

function getFilterStatus(status: string | null): FilterStatus {
  if (status === "archived") return "archived";
  return ORDER_STATUSES.includes(status as OrderStatusType)
    ? (status as OrderStatusType)
    : "all";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countUnits(order: OrderWithItemsType): number {
  return (order.order_items ?? []).reduce((sum, item) => sum + item.quantity, 0);
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return date.toDateString() === new Date().toDateString();
}

type UnattendedUrgency = "none" | "warning" | "critical" | "abandoned";

function getUnattendedUrgency(order: OrderWithItemsType): UnattendedUrgency {
  if (order.status !== "pending" || !order.created_at || order.is_archived) return "none";
  const ageMs = Date.now() - new Date(order.created_at).getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const THREE_DAYS_MS = 3 * ONE_DAY_MS;
  const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

  if (ageMs <= ONE_DAY_MS) return "none";
  if (ageMs <= THREE_DAYS_MS) return "warning";
  if (ageMs <= THIRTY_DAYS_MS) return "critical";
  return "abandoned";
}

function getDateGroup(order: OrderWithItemsType): "Hoy" | "Ayer" | "Esta semana" | "Más antiguos" {
  if (!order.created_at) return "Más antiguos";
  const date = new Date(order.created_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date >= today) return "Hoy";
  if (date >= yesterday) return "Ayer";
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return date >= weekStart ? "Esta semana" : "Más antiguos";
}

interface OrderCardProps {
  order: OrderWithItemsType;
  isSelected: boolean;
  onClick: () => void;
  onQuickConfirm: (order: OrderWithItemsType) => void;
  isConfirming: boolean;
  onArchive: (order: OrderWithItemsType) => void;
  isArchiving: boolean;
}

function OrderCard({
  order,
  isSelected,
  onClick,
  onQuickConfirm,
  isConfirming,
  onArchive,
  isArchiving,
}: OrderCardProps) {
  const urgency = getUnattendedUrgency(order);

  const urgencyCardClass =
    urgency === "warning"
      ? styles.cardUnattended_warning
      : urgency === "critical"
        ? styles.cardUnattended_critical
        : urgency === "abandoned"
          ? styles.cardUnattended_abandoned
          : "";

  return (
    <div
      className={`${styles.card} ${styles[`card_${order.status}`]} ${isSelected ? styles.cardSelected : ""} ${urgencyCardClass} ${order.is_archived ? styles.card_archived : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.cardHeader}>
        <span className={styles.orderNumber}>
          #{String(order.order_number).padStart(4, "0")}
        </span>
        <span
          className={`${styles.statusBadge} ${styles[`badge_${order.status}`]}`}
        >
          {STATUS_LABELS[order.status]}
        </span>
        {order.is_archived && (
          <span className={`${styles.statusBadge} ${styles.badge_archived}`}>
            Archivado
          </span>
        )}
        {urgency === "warning" && (
          <span className={`${styles.unattendedBadge} ${styles.unattendedBadge_warning}`}>
            ! Sin atender
          </span>
        )}
        {urgency === "critical" && (
          <span className={`${styles.unattendedBadge} ${styles.unattendedBadge_critical}`}>
            ! Sin atender
          </span>
        )}
        {urgency === "abandoned" && (
          <span className={`${styles.unattendedBadge} ${styles.unattendedBadge_abandoned}`}>
            Abandonado
          </span>
        )}
        <span className={styles.timeAgo}>{timeAgo(order.created_at)}</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardBodyMain}>
          <span className={styles.customerName}>{order.customer_name}</span>
          {order.customer_address && (
            <span className={styles.address}>{order.customer_address}</span>
          )}
        </div>
        <div className={styles.cardTotalBox}>
          <span className={styles.cardTotal}>
            {formatPrice(order.total + (order.delivery_cost ?? 0))}
          </span>
          <span className={styles.cardItems}>
            {countUnits(order)} {countUnits(order) === 1 ? "producto" : "productos"}
          </span>
        </div>
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.cardMeta}>
          <span className={styles.modality}>
            {order.modality === "delivery" ? (
              <>
                <ScooterIcon size={15} /> Delivery
              </>
            ) : (
              <>
                <StoreIcon size={15} /> Retiro
              </>
            )}
          </span>
          <span className={styles.metaDot} aria-hidden="true">·</span>
          <span className={styles.createdAt}>{formatDate(order.created_at)}</span>
        </span>
        <div className={styles.cardActions}>
          {order.status === "pending" && !order.is_archived && urgency === "abandoned" && (
            <button
              type="button"
              className={styles.archiveButton}
              onClick={(event) => {
                event.stopPropagation();
                onArchive(order);
              }}
              disabled={isArchiving}
            >
              {isArchiving ? "Archivando..." : "Archivar"}
            </button>
          )}
          {order.status === "pending" && !order.is_archived && urgency !== "abandoned" && (
            <button
              type="button"
              className={styles.quickConfirmButton}
              onClick={(event) => {
                event.stopPropagation();
                onQuickConfirm(order);
              }}
              disabled={isConfirming}
            >
              {isConfirming ? "Confirmando..." : "Confirmar"}
            </button>
          )}
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
  onArchiveToggle: (order: OrderWithItemsType, is_archived: boolean) => void;
  isArchiving: boolean;
  productImages: Map<string, string | null | undefined>;
  position: { index: number; total: number } | null;
  onPrev: () => void;
  onNext: () => void;
}

function OrderDetailPanel({
  order,
  onStatusChange,
  onDelete,
  onClose,
  isPending,
  isPanelOpen,
  onArchiveToggle,
  isArchiving,
  productImages,
  position,
  onPrev,
  onNext,
}: OrderDetailPanelProps) {
  if (!order) {
    return null;
  }

  const nextStatus = getNextStatus(order.status, order.modality);
  const nextLabel = getNextLabel(order.status, order.modality);

  return (
    <div
      className={`${styles.panel} ${isPanelOpen ? styles.panelVisible : ""}`}
    >
      <div className={styles.panelHeader}>
        <span className={styles.panelOrderNumber}>
          #{String(order.order_number).padStart(4, "0")}
        </span>
        <div className={styles.panelHeaderRight}>
          {position && (
            <div className={styles.panelNav} aria-label="Navegar entre pedidos">
              <button
                type="button"
                className={styles.panelNavBtn}
                onClick={onPrev}
                disabled={position.index <= 0}
                aria-label="Pedido anterior"
              >
                <ChevronLeftIcon size={16} />
              </button>
              <span className={styles.panelNavCount}>
                {position.index + 1} / {position.total}
              </span>
              <button
                type="button"
                className={styles.panelNavBtn}
                onClick={onNext}
                disabled={position.index >= position.total - 1}
                aria-label="Pedido siguiente"
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          )}
          <button
            type="button"
            className={styles.archivePanelButton}
            onClick={() => onArchiveToggle(order, !order.is_archived)}
            disabled={isArchiving}
          >
            {order.is_archived ? "Desarchivar" : "Archivar"}
          </button>
          <button className={styles.panelCloseBtn} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className={styles.panelBadges}>
          <span
            className={`${styles.statusBadge} ${styles[`badge_${order.status}`]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
          {order.is_archived && (
            <span className={`${styles.statusBadge} ${styles.badge_archived}`}>
              Archivado
            </span>
          )}
        </div>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.panelCol}>
          <div className={styles.panelSection}>
            <span className={styles.panelLabel}>Cliente</span>
            <span className={styles.panelValue}>{order.customer_name}</span>
            {order.customer_address && (
              <div className={styles.contactRow}>
                <span className={styles.panelSubValue}>
                  {order.customer_address}
                </span>
                <a
                  className={styles.mapsLink}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PinIcon size={15} /> Ver en Maps
                </a>
              </div>
            )}
            {order.customer_phone && (
              <div className={styles.contactRow}>
                <span className={`${styles.panelSubValue} ${styles.iconLine}`}>
                  <PhoneIcon size={15} /> {order.customer_phone}
                </span>
                <a
                  className={styles.waLink}
                  href={`https://wa.me/${toWhatsAppNumber(order.customer_phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon size={15} /> WhatsApp
                </a>
              </div>
            )}
          </div>

          <div className={styles.panelSection}>
            <span className={styles.panelLabel}>Modalidad</span>
            <span className={`${styles.panelValue} ${styles.iconLine}`}>
              {order.modality === "delivery" ? (
                <>
                  <ScooterIcon size={18} /> Delivery
                </>
              ) : (
                <>
                  <StoreIcon size={18} /> Retiro en local
                </>
              )}
            </span>
          </div>

          {order.notes && (
            <div className={styles.panelSection}>
              <span className={styles.panelLabel}>Notas del cliente</span>
              <p className={styles.noteCallout}>{order.notes}</p>
            </div>
          )}
        </div>

        <div className={`${styles.panelCol} ${styles.panelColRight}`}>
          <div className={styles.panelSection}>
            <span className={styles.panelLabel}>
              Productos
              <span className={styles.unitsChip}>
                {countUnits(order)} {countUnits(order) === 1 ? "unidad" : "unidades"}
              </span>
            </span>
            <ul className={styles.itemsList}>
              {(order.order_items ?? []).map((item) => {
                const imageUrl = item.product_id
                  ? productImages.get(item.product_id)
                  : null;
                return (
                  <li key={item.id} className={styles.item}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className={styles.itemThumb}
                        loading="lazy"
                      />
                    ) : (
                      <span className={`${styles.itemThumb} ${styles.itemThumbEmpty}`}>
                        <ProductsIcon size={18} />
                      </span>
                    )}
                    <span className={styles.itemName}>
                      <strong className={styles.itemQty}>{item.quantity}x</strong>{" "}
                      {item.product_name}
                    </span>
                    <span className={styles.itemSubtotal}>
                      {formatPrice(item.subtotal)}
                    </span>
                  </li>
                );
              })}
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
      </div>

      <div className={styles.panelFooter}>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={() => onDelete(order)}
        >
          <TrashIcon size={16} />
          Eliminar
        </button>
        {nextStatus && nextLabel && (
          <button
            className={styles.actionButton}
            onClick={() => onStatusChange(order.id, nextStatus, order)}
            disabled={isPending}
          >
            {isPending ? "Guardando..." : nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const archiveOrder = useArchiveOrder();
  const { data: products } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();

  const filterStatus = getFilterStatus(searchParams.get("status"));
  const [filterModality, setFilterModality] = useState<FilterModality>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithItemsType | null>(
    null,
  );
  const [pendingWaUrl, setPendingWaUrl] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const { data: counts } = useOrderCounts();
  const olderOrders = useOlderOrders(showOlder);
  const archivedQuery = useArchivedOrders(filterStatus === "archived");

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (orderId) {
      setSelectedOrderId(orderId);
      setIsPanelOpen(true);
    }
  }, [searchParams]);

  // Recientes + abiertos, más los completados antiguos si se pidieron; los archivados van aparte
  const activeOrders = [...(orders ?? []), ...(olderOrders.data?.pages.flat() ?? [])];
  const archivedOrders = archivedQuery.data?.pages.flat() ?? [];
  const pagedQuery = filterStatus === "archived" ? archivedQuery : olderOrders;
  const isListLoading = filterStatus === "archived" ? archivedQuery.isLoading : isLoading;

  const countByStatus = (status: OrderStatusType) =>
    counts?.[status] ?? activeOrders.filter((o) => o.status === status).length;

  const ordersToFilter = filterStatus === "archived" ? archivedOrders : activeOrders;

  const filtered = ordersToFilter.filter((o) => {
    if (filterStatus !== "all" && filterStatus !== "archived" && o.status !== filterStatus) return false;
    if (filterModality !== "all" && o.modality !== filterModality) return false;
    if (showTodayOnly && !isToday(o.created_at)) return false;
    if (!o.customer_name.toLocaleLowerCase().includes(searchCustomer.trim().toLocaleLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

  const dateGroups = ["Hoy", "Ayer", "Esta semana", "Más antiguos"] as const;

  const productImages = new Map<string, string | null | undefined>(
    (products ?? []).map(
      (product) => [product.id, product.image_url] as const,
    ),
  );

  const selectedIndex = selectedOrderId
    ? filtered.findIndex((o) => o.id === selectedOrderId)
    : -1;
  const panelPosition =
    selectedIndex >= 0 ? { index: selectedIndex, total: filtered.length } : null;

  const goToOrder = (offset: number) => {
    if (selectedIndex < 0) return;
    const target = filtered[selectedIndex + offset];
    if (target) setSelectedOrderId(target.id);
  };

  useEffect(() => {
    if (!isPanelOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPanelOpen(false);
        setSelectedOrderId(null);
      } else if (event.key === "ArrowLeft") {
        goToOrder(-1);
      } else if (event.key === "ArrowRight") {
        goToOrder(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const selectedOrder = selectedOrderId
    ? ([...activeOrders, ...archivedOrders].find((o) => o.id === selectedOrderId) ?? null)
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

  const handleArchive = (order: OrderWithItemsType, is_archived: boolean = true) => {
    if (archiveOrder.isPending) return;
    archiveOrder.mutate(
      { id: order.id, is_archived },
      {
        onSuccess: () => {
          setSuccessMessage(
            is_archived
              ? `Pedido #${String(order.order_number).padStart(4, "0")} archivado.`
              : `Pedido #${String(order.order_number).padStart(4, "0")} desarchivado.`
          );
          window.setTimeout(() => setSuccessMessage(null), 3000);
        },
        onError: () => console.error("Error al archivar el pedido", order.id),
      },
    );
  };

  const handleDeleteRequest = (order: OrderWithItemsType) =>
    setOrderToDelete(order);
  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    try {
      await deleteOrder.mutateAsync(orderToDelete.id);
      if (selectedOrderId === orderToDelete.id) {
        setSelectedOrderId(null);
        setIsPanelOpen(false);
      }
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

  const handleQuickConfirm = (order: OrderWithItemsType) => {
    if (updateStatus.isPending) return;
    updateStatus.mutate(
      { id: order.id, status: "confirmed" },
      {
        onSuccess: () => {
          setSuccessMessage(`Pedido #${String(order.order_number).padStart(4, "0")} confirmado.`);
          window.setTimeout(() => setSuccessMessage(null), 3000);
        },
        onError: () => console.error("Error al confirmar el pedido", order.id),
      },
    );
  };

  const handleStatusFilterChange = (status: FilterStatus) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (status === "all") {
      nextSearchParams.delete("status");
    } else {
      nextSearchParams.set("status", status);
    }
    setSearchParams(nextSearchParams);
  };

  return (
    <div className={`${styles.page} ${selectedOrder ? styles.pageHasSelection : ""}`}>
      <div className={styles.listColumn}>
        <div className={styles.filtersWrapper}>
          <div className={styles.filtersTop}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Buscar por nombre de cliente..."
              value={searchCustomer}
              onChange={(event) => setSearchCustomer(event.target.value)}
            />
            <div className={styles.filterChips}>
            <div className={styles.filterInline}>
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
            <button
              type="button"
              className={`${styles.filterBtn} ${showTodayOnly ? styles.filterBtnActive : ""}`}
              onClick={() => setShowTodayOnly((current) => !current)}
            >
              Solo hoy
            </button>
            </div>
          </div>

          <div className={`${styles.filterGroup} ${styles.statusGroup}`}>
            <button
              className={`${styles.filterBtn} ${filterStatus === "all" ? styles.filterBtnActive : ""}`}
              onClick={() => handleStatusFilterChange("all")}
            >
              Todos
              <span className={`${styles.filterCount} ${styles.filterCount_all}`}>{counts?.active ?? activeOrders.length}</span>
            </button>
            {ORDER_STATUSES.map((s) => (
              <button
                key={s}
                className={`${styles.filterBtn} ${filterStatus === s ? styles.filterBtnActive : ""}`}
                onClick={() => handleStatusFilterChange(s)}
              >
                {STATUS_LABELS[s]}
                <span className={`${styles.filterCount} ${styles[`filterCount_${s}`]}`}>{countByStatus(s)}</span>
              </button>
            ))}
            <button
              className={`${styles.filterBtn} ${filterStatus === "archived" ? styles.filterBtnActive : ""}`}
              onClick={() => handleStatusFilterChange("archived")}
            >
              Archivados
              <span className={`${styles.filterCount} ${styles.filterCount_archived}`}>{counts?.archived ?? archivedOrders.length}</span>
            </button>
          </div>
        </div>

        {successMessage && <p className={styles.successToast} role="status">{successMessage}</p>}

        {isListLoading ? (
          <p className={styles.loadingText}>Cargando pedidos...</p>
        ) : filtered.length === 0 ? (
          <p className={styles.emptyText}>No hay pedidos con estos filtros.</p>
        ) : (
          <div className={styles.groupedList}>
            {dateGroups.map((group) => {
              const ordersInGroup = filtered.filter((order) => getDateGroup(order) === group);
              if (ordersInGroup.length === 0) return null;
              return (
                <section key={group} className={styles.orderGroup}>
                  <h2 className={styles.groupTitle}>{group}</h2>
                  <div className={`${styles.list} ${selectedOrder ? styles.listWithSelection : ""}`}>
                    {ordersInGroup.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        isSelected={selectedOrder?.id === order.id}
                        isConfirming={updateStatus.isPending}
                        onQuickConfirm={handleQuickConfirm}
                        isArchiving={archiveOrder.isPending}
                        onArchive={(o) => handleArchive(o, true)}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setIsPanelOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!isListLoading && (
          <div className={styles.loadMoreRow}>
            {filterStatus !== "archived" && !showOlder && (
              <>
                <p className={styles.loadMoreHint}>
                  Se muestran los pedidos de los últimos {RECENT_ORDERS_DAYS} días y los que siguen abiertos.
                </p>
                <button type="button" className={styles.filterBtn} onClick={() => setShowOlder(true)}>
                  Ver completados más antiguos
                </button>
              </>
            )}
            {(filterStatus === "archived" || showOlder) && pagedQuery.hasNextPage && (
              <button
                type="button"
                className={styles.filterBtn}
                onClick={() => pagedQuery.fetchNextPage()}
                disabled={pagedQuery.isFetchingNextPage}
              >
                {pagedQuery.isFetchingNextPage ? "Cargando..." : "Cargar más"}
              </button>
            )}
            {showOlder && filterStatus !== "archived" && olderOrders.isFetching && !olderOrders.isFetchingNextPage && (
              <p className={styles.loadMoreHint}>Cargando pedidos antiguos...</p>
            )}
          </div>
        )}
      </div>

      {isPanelOpen && selectedOrder && (
        <div
          className={styles.panelOverlay}
          onClick={() => {
            setIsPanelOpen(false);
            setSelectedOrderId(null);
          }}
        />
      )}
      <OrderDetailPanel
        order={selectedOrder}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteRequest}
        isPending={updateStatus.isPending}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedOrderId(null);
        }}
        isPanelOpen={isPanelOpen}
        onArchiveToggle={handleArchive}
        isArchiving={archiveOrder.isPending}
        productImages={productImages}
        position={panelPosition}
        onPrev={() => goToOrder(-1)}
        onNext={() => goToOrder(1)}
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
