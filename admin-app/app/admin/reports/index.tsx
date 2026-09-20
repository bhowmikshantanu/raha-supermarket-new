import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useProducts } from "@/src/context/ProductContext";
import { subscribeToAllOrders } from "@/src/services/firebaseOrders";
import type { Order, OrderStatus } from "@/src/types";
import { formatCurrency } from "@/src/utils/format";

const NAVY = "#082F5B";
const NAVY_DARK = "#052445";
const NAVY_SOFT = "#EAF2FB";
const GOLD = "#F3B53F";
const GOLD_SOFT = "#FFF4D8";
const BG = "#F6F8FC";
const WHITE = "#FFFFFF";
const BORDER = "#E3EAF2";
const TEXT = "#102A43";
const MUTED = "#718096";
const GREEN = "#159A6A";
const RED = "#DC4C4C";
const BLUE = "#2979E2";
const PURPLE = "#7257D5";
const ORANGE = "#D98218";
const TEAL = "#18AFA7";

type DateFilter = "today" | "7days" | "30days" | "custom";

type CustomerReport = {
  key: string;
  uid?: string;
  name: string;
  mobile: string;
  orders: Order[];
  totalOrders: number;
  deliveredOrders: number;
  totalPurchase: number;
  lastPurchase: number;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function AdminReportsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 850;

  const { products, loading: productsLoading } = useProducts();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("30days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerReport | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAllOrders(
      (items) => {
        setOrders(items);
        setOrdersLoading(false);
        setErrorText("");
      },
      (error) => {
        console.error("Reports order subscription failed:", error);
        setOrdersLoading(false);
        setErrorText("Unable to load live order data from Firebase.");
      },
    );

    return unsubscribe;
  }, []);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    let from = 0;
    let to = Number.MAX_SAFE_INTEGER;

    if (dateFilter === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      from = start.getTime();
      to = end.getTime();
    }

    if (dateFilter === "7days") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);

      from = start.getTime();
      to = now.getTime();
    }

    if (dateFilter === "30days") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 29);

      from = start.getTime();
      to = now.getTime();
    }

    if (dateFilter === "custom") {
      if (customFrom) {
        const start = new Date(`${customFrom}T00:00:00`);
        if (!Number.isNaN(start.getTime())) {
          from = start.getTime();
        }
      }

      if (customTo) {
        const end = new Date(`${customTo}T23:59:59.999`);
        if (!Number.isNaN(end.getTime())) {
          to = end.getTime();
        }
      }
    }

    return orders.filter((order) => {
      const createdAt = Number(order.createdAt || 0);
      return createdAt >= from && createdAt <= to;
    });
  }, [
    orders,
    dateFilter,
    customFrom,
    customTo,
  ]);

  const paymentReport = useMemo(() => {
    const codOrders = filteredOrders.filter(
      (order) => order.paymentMethod === "cod",
    );

    const onlineOrders = filteredOrders.filter(
      (order) => order.paymentMethod === "online",
    );

    const deliveredCod = codOrders.filter(
      (order) => order.status === "delivered",
    );

    const deliveredOnline = onlineOrders.filter(
      (order) => order.status === "delivered",
    );

    return {
      codOrders: codOrders.length,
      onlineOrders: onlineOrders.length,

      codRevenue: deliveredCod.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0,
      ),

      onlineRevenue: deliveredOnline.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0,
      ),

      paidOnline: onlineOrders.filter(
        (order) => order.paymentStatus === "paid",
      ).length,

      pendingOnline: onlineOrders.filter(
        (order) => order.paymentStatus !== "paid",
      ).length,
    };
  }, [filteredOrders]);

  const report = useMemo(() => {
    const deliveredOrders = filteredOrders.filter(
      (order) => order.status === "delivered",
    );

    const cancelledOrders = filteredOrders.filter(
      (order) => order.status === "cancelled",
    );

    const activeOrders = filteredOrders.filter(
      (order) =>
        order.status === "placed" ||
        order.status === "confirmed" ||
        order.status === "preparing" ||
        order.status === "out-for-delivery",
    );

    const sales = deliveredOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );

    const averageOrderValue =
      deliveredOrders.length > 0
        ? sales / deliveredOrders.length
        : 0;

    const totalItemsSold = deliveredOrders.reduce(
      (orderTotal, order) =>
        orderTotal +
        order.items.reduce(
          (itemTotal, item) =>
            itemTotal + Number(item.quantity || 0),
          0,
        ),
      0,
    );

    const productSalesMap = new Map<
      string,
      {
        productId: string;
        name: string;
        quantity: number;
        revenue: number;
      }
    >();

    for (const order of deliveredOrders) {
      for (const item of order.items) {
        const current =
          productSalesMap.get(item.productId) ?? {
            productId: item.productId,
            name: item.name,
            quantity: 0,
            revenue: 0,
          };

        current.quantity += Number(item.quantity || 0);
        current.revenue +=
          Number(item.price || 0) *
          Number(item.quantity || 0);

        productSalesMap.set(item.productId, current);
      }
    }

    const topProducts = Array.from(
      productSalesMap.values(),
    )
      .sort(
        (a, b) =>
          b.quantity - a.quantity ||
          b.revenue - a.revenue,
      )
      .slice(0, 5);

    const statusSummary = (
      Object.keys(STATUS_LABELS) as OrderStatus[]
    ).map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: filteredOrders.filter(
        (order) => order.status === status,
      ).length,
    }));

    const lowStockProducts = products
      .filter(
        (product) =>
          product.stock > 0 &&
          product.stock <= 5,
      )
      .sort((a, b) => a.stock - b.stock);

    const outOfStockProducts = products.filter(
      (product) => product.stock <= 0,
    );

    const inventoryRetailValue = products.reduce(
      (sum, product) =>
        sum +
        Number(product.price || 0) *
          Number(product.stock || 0),
      0,
    );

    return {
      sales,
      averageOrderValue,
      totalItemsSold,
      deliveredCount: deliveredOrders.length,
      cancelledCount: cancelledOrders.length,
      activeCount: activeOrders.length,
      totalOrders: filteredOrders.length,
      topProducts,
      statusSummary,
      lowStockProducts,
      outOfStockProducts,
      inventoryRetailValue,
    };
  }, [filteredOrders, products]);

  const customers = useMemo(() => {
    const map = new Map<
      string,
      {
        uid?: string;
        name: string;
        mobile: string;
        orders: Order[];
      }
    >();

    for (const order of filteredOrders) {
      const name =
        order.customerName?.trim() ||
        order.address?.fullName?.trim() ||
        "Customer";

      const mobile =
        order.customerMobile?.trim() ||
        order.address?.mobile?.trim() ||
        "Not available";

      const key =
        order.customerUid?.trim() ||
        (mobile !== "Not available"
          ? `mobile:${mobile}`
          : `name:${name.toLowerCase()}`);

      const existing = map.get(key);

      if (existing) {
        existing.orders.push(order);

        if (
          existing.name === "Customer" &&
          name !== "Customer"
        ) {
          existing.name = name;
        }

        if (
          existing.mobile === "Not available" &&
          mobile !== "Not available"
        ) {
          existing.mobile = mobile;
        }
      } else {
        map.set(key, {
          uid: order.customerUid,
          name,
          mobile,
          orders: [order],
        });
      }
    }

    return Array.from(map.entries())
      .map(([key, customer]): CustomerReport => {
        const sortedOrders = [...customer.orders].sort(
          (a, b) =>
            Number(b.createdAt || 0) -
            Number(a.createdAt || 0),
        );

        const delivered = sortedOrders.filter(
          (order) => order.status === "delivered",
        );

        return {
          key,
          uid: customer.uid,
          name: customer.name,
          mobile: customer.mobile,
          orders: sortedOrders,
          totalOrders: sortedOrders.length,
          deliveredOrders: delivered.length,
          totalPurchase: delivered.reduce(
            (sum, order) =>
              sum + Number(order.total || 0),
            0,
          ),
          lastPurchase:
            sortedOrders[0]?.createdAt || 0,
        };
      })
      .sort(
        (a, b) =>
          b.totalPurchase - a.totalPurchase ||
          b.totalOrders - a.totalOrders,
      );
  }, [filteredOrders]);

  const filteredCustomers = useMemo(() => {
    const search = customerSearch
      .trim()
      .toLowerCase();

    if (!search) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.name
          .toLowerCase()
          .includes(search) ||
        customer.mobile
          .toLowerCase()
          .includes(search),
    );
  }, [customers, customerSearch]);

  const customerTotals = useMemo(
    () => ({
      customers: customers.length,
      repeatCustomers: customers.filter(
        (customer) =>
          customer.totalOrders > 1,
      ).length,
      totalPurchases: customers.reduce(
        (sum, customer) =>
          sum + customer.totalPurchase,
        0,
      ),
    }),
    [customers],
  );

  if (productsLoading || ordersLoading) {
    return (
      <SafeAreaView style={styles.loadingPage}>
        <ActivityIndicator
          size="large"
          color={NAVY}
        />
        <Text style={styles.loadingText}>
          Loading live reports...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={NAVY}
          />
        </TouchableOpacity>

        <View style={styles.headerIcon}>
          <Ionicons
            name="analytics-outline"
            size={23}
            color={GOLD}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.heading}>
            Reports & Insights
          </Text>
          <Text style={styles.subheading}>
            Sales, customers, orders and inventory analytics
          </Text>
        </View>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>
            LIVE DATA
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
      >
        {errorText ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#B91C1C"
            />
            <Text style={styles.errorText}>
              {errorText}
            </Text>
          </View>
        ) : null}

        <View style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <View>
              <Text style={styles.filterTitle}>
                Report Period
              </Text>
              <Text style={styles.filterSubtitle}>
                All reports below follow the selected period
              </Text>
            </View>

            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>
                {filteredOrders.length} orders
              </Text>
            </View>
          </View>

          <View style={styles.filterButtons}>
            {(
              [
                ["today", "Today"],
                ["7days", "7 Days"],
                ["30days", "30 Days"],
                ["custom", "Custom Range"],
              ] as const
            ).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.filterButton,
                  dateFilter === value &&
                    styles.filterButtonActive,
                ]}
                onPress={() => setDateFilter(value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    dateFilter === value &&
                      styles.filterButtonTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {dateFilter === "custom" ? (
            <View style={styles.customDateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>
                  From
                </Text>
                <TextInput
                  value={customFrom}
                  onChangeText={setCustomFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#98A4B3"
                  style={styles.dateInput}
                />
              </View>

              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>
                  To
                </Text>
                <TextInput
                  value={customTo}
                  onChangeText={setCustomTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#98A4B3"
                  style={styles.dateInput}
                />
              </View>
            </View>
          ) : null}
        </View>

        <SectionHeading
          title="Sales Overview"
          subtitle="Revenue uses delivered orders only"
          icon="cash-outline"
        />

        <View style={styles.metricGrid}>
          <MetricCard
            icon="wallet-outline"
            label="Delivered Sales"
            value={formatCurrency(report.sales)}
            note="Actual delivered revenue"
            accent={GREEN}
            soft="#E7F8F1"
          />

          <MetricCard
            icon="receipt-outline"
            label="Total Orders"
            value={String(report.totalOrders)}
            note={`${report.deliveredCount} delivered`}
            accent={BLUE}
            soft="#EAF3FF"
          />

          <MetricCard
            icon="calculator-outline"
            label="Average Order"
            value={formatCurrency(
              report.averageOrderValue,
            )}
            note="Delivered orders only"
            accent={PURPLE}
            soft="#F0ECFF"
          />

          <MetricCard
            icon="cube-outline"
            label="Items Sold"
            value={String(report.totalItemsSold)}
            note="Delivered quantities"
            accent={ORANGE}
            soft="#FFF3E2"
          />
        </View>

        <SectionHeading
          title="Customer Reports"
          subtitle="Customer-wise purchase and order analytics"
          icon="people-outline"
        />

        <View style={styles.customerSummary}>
          <SmallSummary
            label="Customers"
            value={String(customerTotals.customers)}
            icon="people"
            color={NAVY}
          />
          <SmallSummary
            label="Repeat Customers"
            value={String(
              customerTotals.repeatCustomers,
            )}
            icon="repeat"
            color={PURPLE}
          />
          <SmallSummary
            label="Customer Purchases"
            value={formatCurrency(
              customerTotals.totalPurchases,
            )}
            icon="bag-check"
            color={GREEN}
          />
        </View>

        <View style={styles.customerCard}>
          <View
            style={[
              styles.customerCardHeader,
              !desktop &&
                styles.customerCardHeaderMobile,
            ]}
          >
            <View>
              <Text style={styles.cardTitle}>
                Customer-wise Report
              </Text>
              <Text style={styles.cardSubtitle}>
                Tap a customer to view complete purchase history
              </Text>
            </View>

            <View style={styles.searchBox}>
              <Ionicons
                name="search"
                size={18}
                color={MUTED}
              />
              <TextInput
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholder="Search name or mobile"
                placeholderTextColor="#98A4B3"
                style={styles.searchInput}
              />
              {customerSearch ? (
                <TouchableOpacity
                  onPress={() =>
                    setCustomerSearch("")
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={MUTED}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {filteredCustomers.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No customers found"
              message={
                customerSearch
                  ? "No customer matches this search."
                  : "Customer reports will appear after orders are placed."
              }
            />
          ) : (
            filteredCustomers.map(
              (customer, index) => (
                <TouchableOpacity
                  key={customer.key}
                  activeOpacity={0.75}
                  style={[
                    styles.customerRow,
                    index <
                      filteredCustomers.length -
                        1 &&
                      styles.rowDivider,
                  ]}
                  onPress={() =>
                    setSelectedCustomer(customer)
                  }
                >
                  <View
                    style={styles.customerAvatar}
                  >
                    <Text
                      style={styles.customerAvatarText}
                    >
                      {customer.name
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={styles.customerIdentity}
                  >
                    <Text
                      style={styles.customerName}
                      numberOfLines={1}
                    >
                      {customer.name}
                    </Text>
                    <Text
                      style={styles.customerMobile}
                    >
                      {customer.mobile}
                    </Text>
                  </View>

                  {desktop ? (
                    <>
                      <CustomerColumn
                        label="Orders"
                        value={String(
                          customer.totalOrders,
                        )}
                      />
                      <CustomerColumn
                        label="Delivered"
                        value={String(
                          customer.deliveredOrders,
                        )}
                      />
                      <CustomerColumn
                        label="Total Purchase"
                        value={formatCurrency(
                          customer.totalPurchase,
                        )}
                        strong
                      />
                      <CustomerColumn
                        label="Last Order"
                        value={formatDate(
                          customer.lastPurchase,
                        )}
                      />
                    </>
                  ) : (
                    <View
                      style={
                        styles.mobileCustomerStats
                      }
                    >
                      <Text
                        style={
                          styles.mobileCustomerPurchase
                        }
                      >
                        {formatCurrency(
                          customer.totalPurchase,
                        )}
                      </Text>
                      <Text
                        style={
                          styles.mobileCustomerOrders
                        }
                      >
                        {customer.totalOrders} orders
                      </Text>
                    </View>
                  )}

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={NAVY}
                  />
                </TouchableOpacity>
              ),
            )
          )}
        </View>

        <SectionHeading
          title="Payment Report"
          subtitle="COD and online payment performance for selected period"
          icon="card-outline"
        />

        <View style={styles.metricGrid}>
          <MetricCard
            icon="cash-outline"
            label="COD Orders"
            value={String(paymentReport.codOrders)}
            note={formatCurrency(paymentReport.codRevenue) + " delivered"}
            accent={ORANGE}
            soft="#FFF3E2"
          />

          <MetricCard
            icon="card-outline"
            label="Online Orders"
            value={String(paymentReport.onlineOrders)}
            note={formatCurrency(paymentReport.onlineRevenue) + " delivered"}
            accent={BLUE}
            soft="#EAF3FF"
          />

          <MetricCard
            icon="checkmark-circle-outline"
            label="Online Paid"
            value={String(paymentReport.paidOnline)}
            note="Verified paid orders"
            accent={GREEN}
            soft="#E7F8F1"
          />

          <MetricCard
            icon="time-outline"
            label="Online Pending"
            value={String(paymentReport.pendingOnline)}
            note="Not marked paid"
            accent={PURPLE}
            soft="#F0ECFF"
          />
        </View>

        <SectionHeading
          title="Order Report"
          subtitle="Order status distribution for selected period"
          icon="receipt-outline"
        />


        <View style={styles.statusCard}>
          {report.statusSummary.map(
            (item, index) => (
              <View
                key={item.status}
                style={[
                  styles.statusRow,
                  index <
                    report.statusSummary.length -
                      1 &&
                    styles.rowDivider,
                ]}
              >
                <View style={styles.statusLeft}>
                  <View
                    style={[
                      styles.statusDot,
                      getStatusDotStyle(
                        item.status,
                      ),
                    ]}
                  />
                  <Text
                    style={styles.statusLabel}
                  >
                    {item.label}
                  </Text>
                </View>

                <Text
                  style={styles.statusCount}
                >
                  {item.count}
                </Text>
              </View>
            ),
          )}
        </View>

        <View style={styles.secondaryMetricRow}>
          <SmallSummary
            label="Active Orders"
            value={String(report.activeCount)}
            icon="time-outline"
            color={BLUE}
          />
          <SmallSummary
            label="Cancelled"
            value={String(
              report.cancelledCount,
            )}
            icon="close-circle-outline"
            color={RED}
          />
          <SmallSummary
            label="Delivered"
            value={String(
              report.deliveredCount,
            )}
            icon="checkmark-circle-outline"
            color={GREEN}
          />
        </View>

        <SectionHeading
          title="Product Sales Report"
          subtitle="Products ranked by delivered quantity and revenue for selected period"
          icon="trophy-outline"
        />

        <View style={styles.standardCard}>
          {report.topProducts.length === 0 ? (
            <EmptyState
              icon="stats-chart-outline"
              title="No delivered sales yet"
              message="Top products will appear after delivered orders are available."
            />
          ) : (
            report.topProducts.map(
              (item, index) => (
                <View
                  key={item.productId}
                  style={[
                    styles.productRow,
                    index <
                      report.topProducts.length -
                        1 &&
                      styles.rowDivider,
                  ]}
                >
                  <View style={styles.rankCircle}>
                    <Text
                      style={styles.rankText}
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <View
                    style={styles.productInfo}
                  >
                    <Text
                      style={styles.productName}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={styles.productMeta}
                    >
                      {item.quantity} item(s) sold
                    </Text>
                  </View>

                  <Text
                    style={styles.productRevenue}
                  >
                    {formatCurrency(
                      item.revenue,
                    )}
                  </Text>
                </View>
              ),
            )
          )}
        </View>

        <SectionHeading
          title="Inventory Insights"
          subtitle="Current catalogue and restock health"
          icon="storefront-outline"
        />

        <View style={styles.metricGrid}>
          <MetricCard
            icon="cube-outline"
            label="Products"
            value={String(products.length)}
            note="Current catalogue"
            accent={NAVY}
            soft={NAVY_SOFT}
          />
          <MetricCard
            icon="warning-outline"
            label="Low Stock"
            value={String(
              report.lowStockProducts.length,
            )}
            note="Stock between 1 and 5"
            accent={ORANGE}
            soft="#FFF3E2"
          />
          <MetricCard
            icon="close-circle-outline"
            label="Out of Stock"
            value={String(
              report.outOfStockProducts.length,
            )}
            note="Needs restocking"
            accent={RED}
            soft="#FFECEC"
          />
          <MetricCard
            icon="wallet-outline"
            label="Stock Value"
            value={formatCurrency(
              report.inventoryRetailValue,
            )}
            note="At current selling prices"
            accent={TEAL}
            soft="#E5F9F7"
          />
        </View>

        <SectionHeading
          title="Restock Attention"
          subtitle="Products requiring inventory action"
          icon="alert-circle-outline"
        />

        <View style={styles.standardCard}>
          {report.outOfStockProducts.length ===
            0 &&
          report.lowStockProducts.length ===
            0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="Inventory looks healthy"
              message="No low-stock or out-of-stock products right now."
            />
          ) : (
            <>
              {report.outOfStockProducts.map(
                (product) => (
                  <InventoryRow
                    key={`out-${product.id}`}
                    name={product.name}
                    stock={product.stock}
                    label="Out of stock"
                  />
                ),
              )}

              {report.lowStockProducts.map(
                (product) => (
                  <InventoryRow
                    key={`low-${product.id}`}
                    name={product.name}
                    stock={product.stock}
                    label="Low stock"
                  />
                ),
              )}
            </>
          )}
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={NAVY}
          />
          <Text style={styles.infoText}>
            Revenue and customer purchase totals use
            delivered orders only. Cancelled or unfinished
            orders do not inflate sales figures.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={selectedCustomer !== null}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSelectedCustomer(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              desktop &&
                styles.modalCardDesktop,
            ]}
          >
            {selectedCustomer ? (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={
                      styles.modalCustomerAvatar
                    }
                  >
                    <Text
                      style={
                        styles.modalCustomerAvatarText
                      }
                    >
                      {selectedCustomer.name
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={styles.modalTitle}
                    >
                      {selectedCustomer.name}
                    </Text>
                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      {selectedCustomer.mobile}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() =>
                      setSelectedCustomer(null)
                    }
                  >
                    <Ionicons
                      name="close"
                      size={23}
                      color={NAVY}
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.customerModalSummary
                  }
                >
                  <ModalStat
                    label="Total Orders"
                    value={String(
                      selectedCustomer.totalOrders,
                    )}
                  />
                  <ModalStat
                    label="Delivered"
                    value={String(
                      selectedCustomer.deliveredOrders,
                    )}
                  />
                  <ModalStat
                    label="Total Purchase"
                    value={formatCurrency(
                      selectedCustomer.totalPurchase,
                    )}
                  />
                </View>

                <View
                  style={styles.historyHeading}
                >
                  <Ionicons
                    name="bag-handle-outline"
                    size={20}
                    color={GOLD}
                  />
                  <Text
                    style={styles.historyTitle}
                  >
                    Purchase History
                  </Text>
                </View>

                <ScrollView
                  style={styles.historyScroll}
                  showsVerticalScrollIndicator
                >
                  {selectedCustomer.orders.map(
                    (order) => (
                      <View
                        key={order.id}
                        style={
                          styles.historyOrderCard
                        }
                      >
                        <View
                          style={
                            styles.historyOrderTop
                          }
                        >
                          <View
                            style={{ flex: 1 }}
                          >
                            <Text
                              style={
                                styles.historyOrderId
                              }
                              numberOfLines={1}
                            >
                              #{order.id}
                            </Text>
                            <Text
                              style={
                                styles.historyOrderDate
                              }
                            >
                              {formatDateTime(
                                order.createdAt,
                              )}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.orderStatusBadge,
                              {
                                backgroundColor:
                                  statusBackground(
                                    order.status,
                                  ),
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.orderStatusText,
                                {
                                  color:
                                    statusColor(
                                      order.status,
                                    ),
                                },
                              ]}
                            >
                              {
                                STATUS_LABELS[
                                  order.status
                                ]
                              }
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.historyItems
                          }
                        >
                          {order.items.map(
                            (item, itemIndex) => (
                              <View
                                key={`${order.id}-${item.productId}-${itemIndex}`}
                                style={
                                  styles.historyItemRow
                                }
                              >
                                <View
                                  style={{
                                    flex: 1,
                                  }}
                                >
                                  <Text
                                    style={
                                      styles.historyItemName
                                    }
                                  >
                                    {item.name}
                                  </Text>

                                  <Text
                                    style={
                                      styles.historyItemMeta
                                    }
                                  >
                                    Qty:{" "}
                                    {item.quantity}
                                    {item.size
                                      ? ` Â· ${item.size}`
                                      : ""}
                                  </Text>
                                </View>

                                <Text
                                  style={
                                    styles.historyItemPrice
                                  }
                                >
                                  {formatCurrency(
                                    Number(
                                      item.price ||
                                        0,
                                    ) *
                                      Number(
                                        item.quantity ||
                                          0,
                                      ),
                                  )}
                                </Text>
                              </View>
                            ),
                          )}
                        </View>

                        <View
                          style={
                            styles.historyOrderFooter
                          }
                        >
                          <View>
                            <Text
                              style={
                                styles.paymentLabel
                              }
                            >
                              Payment
                            </Text>
                            <Text
                              style={
                                styles.paymentValue
                              }
                            >
                              {order.paymentMethod ===
                              "online"
                                ? "Online"
                                : "Cash on Delivery"}
                            </Text>
                          </View>

                          <View
                            style={{
                              alignItems:
                                "flex-end",
                            }}
                          >
                            <Text
                              style={
                                styles.paymentLabel
                              }
                            >
                              Order Total
                            </Text>
                            <Text
                              style={
                                styles.historyTotal
                              }
                            >
                              {formatCurrency(
                                Number(
                                  order.total || 0,
                                ),
                              )}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={
                            styles.openOrderButton
                          }
                          onPress={() => {
                            const id =
                              order.id;

                            setSelectedCustomer(
                              null,
                            );

                            router.push({
                              pathname:
                                "/admin/orders",
                              params: {
                                orderId: id,
                              },
                            } as never);
                          }}
                        >
                          <Text
                            style={
                              styles.openOrderText
                            }
                          >
                            Open Full Order
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={17}
                            color={NAVY}
                          />
                        </TouchableOpacity>
                      </View>
                    ),
                  )}
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeading({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={GOLD}
        />
      </View>
      <View>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
  accent,
  soft,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  note: string;
  accent: string;
  soft: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View
        style={[
          styles.metricIcon,
          { backgroundColor: soft },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={accent}
        />
      </View>

      <Text
        style={styles.metricValue}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={styles.metricLabel}>
        {label}
      </Text>
      <Text style={styles.metricNote}>
        {note}
      </Text>
    </View>
  );
}

function SmallSummary({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.smallMetricCard}>
      <Ionicons
        name={icon}
        size={21}
        color={color}
      />
      <Text style={styles.smallMetricValue}>
        {value}
      </Text>
      <Text style={styles.smallMetricLabel}>
        {label}
      </Text>
    </View>
  );
}

function CustomerColumn({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.customerColumn}>
      <Text style={styles.customerColumnLabel}>
        {label}
      </Text>
      <Text
        style={[
          styles.customerColumnValue,
          strong &&
            styles.customerColumnStrong,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function ModalStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.modalStat}>
      <Text style={styles.modalStatValue}>
        {value}
      </Text>
      <Text style={styles.modalStatLabel}>
        {label}
      </Text>
    </View>
  );
}

function InventoryRow({
  name,
  stock,
  label,
}: {
  name: string;
  stock: number;
  label: string;
}) {
  return (
    <View
      style={[
        styles.productRow,
        styles.rowDivider,
      ]}
    >
      <View style={styles.inventoryIcon}>
        <Ionicons
          name={
            stock <= 0
              ? "close-circle-outline"
              : "warning-outline"
          }
          size={19}
          color={
            stock <= 0
              ? RED
              : ORANGE
          }
        />
      </View>

      <View style={styles.productInfo}>
        <Text
          style={styles.productName}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text style={styles.productMeta}>
          {label}
        </Text>
      </View>

      <Text style={styles.stockText}>
        Stock: {stock}
      </Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons
        name={icon}
        size={38}
        color="#A1ADBA"
      />
      <Text style={styles.emptyTitle}>
        {title}
      </Text>
      <Text style={styles.emptyMessage}>
        {message}
      </Text>
    </View>
  );
}

function getStatusDotStyle(
  status: OrderStatus,
) {
  return {
    backgroundColor:
      statusColor(status),
  };
}

function statusColor(
  status: OrderStatus,
) {
  switch (status) {
    case "delivered":
      return GREEN;
    case "cancelled":
      return RED;
    case "out-for-delivery":
      return BLUE;
    case "preparing":
      return ORANGE;
    case "confirmed":
      return PURPLE;
    default:
      return NAVY;
  }
}

function statusBackground(
  status: OrderStatus,
) {
  switch (status) {
    case "delivered":
      return "#DDF7EA";
    case "cancelled":
      return "#FFE8E8";
    case "out-for-delivery":
      return "#E4EFFF";
    case "preparing":
      return "#FFF1DC";
    case "confirmed":
      return "#EEE9FF";
    default:
      return NAVY_SOFT;
  }
}

function formatDate(timestamp: number) {
  if (!timestamp) {
    return "â€”";
  }

  return new Date(
    timestamp,
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(
  timestamp: number,
) {
  if (!timestamp) {
    return "Date unavailable";
  }

  return new Date(
    timestamp,
  ).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },

  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F7FB",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontWeight: "700",
  },

  /* ---------- HEADER ---------- */
  header: {
    minHeight: 82,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    shadowColor: "#0F172A",
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#102A43",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  heading: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  subheading: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
  },
  liveBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#E7F8F1",
    borderWidth: 1,
    borderColor: "#CDEDE1",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0F9F75",
  },
  liveText: {
    color: "#087A5A",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  content: { padding: 20, paddingBottom: 60 },

  /* ---------- DATE FILTER ---------- */
  filterCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 17,
    marginBottom: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  filterTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  filterSubtitle: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 11,
  },
  filterCountBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#E8F7F3",
    borderWidth: 1,
    borderColor: "#CDE7E2",
  },
  filterCountText: {
    color: "#087A5A",
    fontSize: 10,
    fontWeight: "900",
  },
  filterButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 15,
    minHeight: 39,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DDE5EF",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: "#102A43",
    borderColor: "#102A43",
  },
  filterButtonText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
  },
  filterButtonTextActive: { color: "#FFFFFF" },
  customDateRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dateField: { flex: 1, minWidth: 170 },
  dateLabel: {
    marginBottom: 6,
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
  },
  dateInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#DDE5EF",
    borderRadius: 11,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
    fontSize: 12,
  },

  /* ---------- SECTION HEADERS ---------- */
  sectionHeading: {
    marginTop: 28,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#102A43",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  sectionSubtitle: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 11,
  },

  /* ---------- METRICS ---------- */
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 190,
    minWidth: 165,
    minHeight: 138,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.055,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    marginTop: 12,
    fontSize: 23,
    fontWeight: "900",
    color: "#102A43",
    letterSpacing: -0.4,
  },
  metricLabel: {
    marginTop: 3,
    color: "#0F172A",
    fontWeight: "800",
  },
  metricNote: {
    marginTop: 5,
    fontSize: 10,
    color: "#64748B",
  },

  customerSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  smallMetricCard: {
    flex: 1,
    minWidth: 150,
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  smallMetricValue: {
    marginTop: 6,
    color: "#102A43",
    fontSize: 20,
    fontWeight: "900",
  },
  smallMetricLabel: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },

  /* ---------- CUSTOMER REPORT ---------- */
  customerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  customerCardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF3",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    backgroundColor: "#FBFCFE",
  },
  customerCardHeaderMobile: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  cardSubtitle: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 11,
  },
  searchBox: {
    width: 270,
    maxWidth: "100%",
    height: 43,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE5EF",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#0F172A",
    fontSize: 12,
    outlineStyle: "none",
  } as any,
  customerRow: {
    minHeight: 80,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#102A43",
    alignItems: "center",
    justifyContent: "center",
  },
  customerAvatarText: {
    color: "#D69E2E",
    fontSize: 16,
    fontWeight: "900",
  },
  customerIdentity: { flex: 1.3, minWidth: 110 },
  customerName: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  customerMobile: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 10,
  },
  customerColumn: { flex: 0.8, minWidth: 85 },
  customerColumnLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  customerColumnValue: {
    marginTop: 4,
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
  },
  customerColumnStrong: {
    color: "#087A5A",
    fontWeight: "900",
  },
  mobileCustomerStats: { alignItems: "flex-end" },
  mobileCustomerPurchase: {
    color: "#087A5A",
    fontSize: 12,
    fontWeight: "900",
  },
  mobileCustomerOrders: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 10,
  },

  /* ---------- STATUS REPORT ---------- */
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  statusRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: {
    color: "#334155",
    fontWeight: "700",
  },
  statusCount: {
    color: "#102A43",
    fontSize: 13,
    fontWeight: "900",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },

  secondaryMetricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },

  /* ---------- PRODUCT / INVENTORY ---------- */
  standardCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  productRow: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  rankCircle: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "#F4D98B",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    color: "#9A6700",
    fontWeight: "900",
  },
  productInfo: { flex: 1 },
  productName: {
    color: "#0F172A",
    fontWeight: "800",
  },
  productMeta: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 10,
  },
  productRevenue: {
    color: "#087A5A",
    fontWeight: "900",
  },
  inventoryIcon: {
    width: 36,
    alignItems: "center",
  },
  stockText: {
    color: "#102A43",
    fontWeight: "800",
  },

  /* ---------- EMPTY / INFO / ERROR ---------- */
  emptyState: {
    minHeight: 175,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    marginTop: 9,
    color: "#0F172A",
    fontWeight: "900",
  },
  emptyMessage: {
    marginTop: 5,
    maxWidth: 370,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  infoCard: {
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#D5E4F3",
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  infoText: {
    flex: 1,
    color: "#102A43",
    lineHeight: 19,
    fontSize: 12,
  },
  errorCard: {
    flexDirection: "row",
    gap: 9,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: "#FFF1F2",
    padding: 14,
  },
  errorText: {
    flex: 1,
    color: "#BE123C",
  },

  /* ---------- CUSTOMER HISTORY MODAL ---------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.64)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  modalCard: {
    width: "100%",
    maxHeight: "92%",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  modalCardDesktop: { maxWidth: 760 },
  modalHeader: {
    minHeight: 84,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF3",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FBFCFE",
  },
  modalCustomerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#102A43",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCustomerAvatarText: {
    color: "#D69E2E",
    fontSize: 19,
    fontWeight: "900",
  },
  modalTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },
  modalSubtitle: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 11,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  customerModalSummary: {
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    gap: 8,
  },
  modalStat: {
    flex: 1,
    minHeight: 70,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  modalStatValue: {
    color: "#102A43",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  modalStatLabel: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
  },

  historyHeading: {
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  historyTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  historyScroll: { paddingHorizontal: 15 },
  historyOrderCard: {
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  historyOrderTop: {
    padding: 13,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyOrderId: {
    color: "#102A43",
    fontSize: 12,
    fontWeight: "900",
  },
  historyOrderDate: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 10,
  },
  orderStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },
  orderStatusText: {
    fontSize: 9,
    fontWeight: "900",
  },
  historyItems: { paddingHorizontal: 13 },
  historyItemRow: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyItemName: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
  },
  historyItemMeta: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 9,
  },
  historyItemPrice: {
    color: "#102A43",
    fontSize: 11,
    fontWeight: "900",
  },
  historyOrderFooter: {
    padding: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  paymentLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "600",
  },
  paymentValue: {
    marginTop: 3,
    color: "#334155",
    fontSize: 10,
    fontWeight: "800",
  },
  historyTotal: {
    marginTop: 3,
    color: "#087A5A",
    fontSize: 13,
    fontWeight: "900",
  },
  openOrderButton: {
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: "#F4D98B",
    backgroundColor: "#FFF7DF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  openOrderText: {
    color: "#9A6700",
    fontSize: 11,
    fontWeight: "900",
  },
});
