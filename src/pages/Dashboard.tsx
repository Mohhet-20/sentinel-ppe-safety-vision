import { motion } from "framer-motion";

import { HeroSection } from "@/components/dashboard/HeroSection";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { LiveCameraPanel } from "@/components/dashboard/LiveCameraPanel";
import { DetectionFeedPanel } from "@/components/dashboard/DetectionFeedPanel";
import { AlertsTimeline } from "@/components/dashboard/AlertsTimeline";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { ViolationChart } from "@/components/dashboard/ViolationChart";
import { WorkerDistributionChart } from "@/components/dashboard/WorkerDistributionChart";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { RecentIncidentsTable } from "@/components/dashboard/RecentIncidentsTable";
import { SystemStatusSidebar } from "@/components/dashboard/SystemStatusSidebar";
import { useDashboardLiveRefresh } from "@/hooks/use-dashboard-data";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  useDashboardLiveRefresh();

  return (
    <div className="flex flex-col gap-6 pb-6">
      <HeroSection />

      <KpiGrid />

      {/* main content: live feed + detections, with system status rail */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LiveCameraPanel />
          <DetectionFeedPanel />
        </div>
        <div className="hidden xl:block">
          <SystemStatusSidebar />
        </div>
      </div>

      {/* system status on smaller breakpoints, below main content */}
      <div className="xl:hidden">
        <SystemStatusSidebar />
      </div>

      {/* bottom section: timeline + charts */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={fadeUp}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3"
      >
        <AlertsTimeline />
        <ComplianceChart />
        <ViolationChart />
        <WorkerDistributionChart />
        <PerformanceChart />
        <RecentIncidentsTable />
      </motion.div>
    </div>
  );
}
