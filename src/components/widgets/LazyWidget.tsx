"use client";

import { Suspense } from "react";
import { Widget, WidgetType } from "../../types/widget";
import {
  LazyWidgetChart,
  LazyWidgetTable,
  LazyWidgetCard,
} from "../LazyComponents";
import {
  ChartSkeleton,
  TableSkeleton,
  WidgetSkeleton,
} from "../ui/LoadingSkeletons";

interface LazyWidgetProps {
  widget: Widget;
  onRefresh: (widgetId: string) => void;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
}

export default function LazyWidget({
  widget,
  onRefresh,
  onConfigure,
  onDelete,
}: LazyWidgetProps) {
  const getWidgetComponent = () => {
    switch (widget.type) {
      case WidgetType.CHART:
        return (
          <Suspense fallback={<ChartSkeleton />}>
            <LazyWidgetChart
              widget={widget}
              onRefresh={onRefresh}
              onConfigure={onConfigure}
              onDelete={onDelete}
            />
          </Suspense>
        );

      case WidgetType.TABLE:
        return (
          <Suspense fallback={<TableSkeleton />}>
            <LazyWidgetTable
              widget={widget}
              onRefresh={onRefresh}
              onConfigure={onConfigure}
              onDelete={onDelete}
            />
          </Suspense>
        );

      case WidgetType.CARD:
      default:
        return (
          <Suspense fallback={<WidgetSkeleton />}>
            <LazyWidgetCard
              widget={widget}
              onRefresh={onRefresh}
              onConfigure={onConfigure}
              onDelete={onDelete}
            />
          </Suspense>
        );
    }
  };

  return getWidgetComponent();
}
