import fs from 'fs';

// 1. MaintenancePage.tsx
{
  let code = fs.readFileSync('src/pages/MaintenancePage.tsx', 'utf8');
  if (!code.includes('formatDuration')) {
    code = code.replace(
      "import { Wrench, Plus } from 'lucide-react';",
      "import { Wrench, Plus } from 'lucide-react';\nimport { formatDuration, formatCurrency } from '../utils/formatters.ts';"
    );
  }
  code = code.replace('{totalDowntime} hrs', "{formatDuration(totalDowntime, 'hrs')}");
  code = code.replace('${totalCost.toLocaleString()}', "{formatCurrency(totalCost)}");
  code = code.replace('{m.downtime_hours}h', "{formatDuration(m.downtime_hours, 'h')}");
  code = code.replace('${m.cost_usd}', "{formatCurrency(m.cost_usd)}");
  fs.writeFileSync('src/pages/MaintenancePage.tsx', code, 'utf8');
  console.log('Updated MaintenancePage.tsx');
}

// 2. SuperAdminFactoryDetail.tsx
{
  let code = fs.readFileSync('src/pages/super-admin/SuperAdminFactoryDetail.tsx', 'utf8');
  if (!code.includes('formatDuration')) {
    code = code.replace(
      "import { ArrowLeft, Building2",
      "import { formatDuration, formatNumber } from '../../utils/formatters.ts';\nimport { ArrowLeft, Building2"
    );
  }
  code = code.replace('{kpis.downtime_hours}h downtime', "{formatDuration(kpis.downtime_hours, 'h')} downtime");
  code = code.replace('{m.downtime_hours}h', "{formatDuration(m.downtime_hours, 'h')}");
  code = code.replace('{wo.estimated_hours}h', "{formatDuration(wo.estimated_hours, 'h')}");
  fs.writeFileSync('src/pages/super-admin/SuperAdminFactoryDetail.tsx', code, 'utf8');
  console.log('Updated SuperAdminFactoryDetail.tsx');
}

// 3. SuperAdminBenchmarking.tsx
{
  let code = fs.readFileSync('src/pages/super-admin/SuperAdminBenchmarking.tsx', 'utf8');
  if (!code.includes('formatDuration')) {
    code = code.replace(
      "import { Building2, TrendingUp",
      "import { formatDuration, formatNumber } from '../../utils/formatters.ts';\nimport { Building2, TrendingUp"
    );
  }
  code = code.replace('{f.kpis.downtime_hours}h', "{formatDuration(f.kpis.downtime_hours, 'h')}");
  fs.writeFileSync('src/pages/super-admin/SuperAdminBenchmarking.tsx', code, 'utf8');
  console.log('Updated SuperAdminBenchmarking.tsx');
}

// 4. WorkOrdersPage.tsx
{
  let code = fs.readFileSync('src/pages/WorkOrdersPage.tsx', 'utf8');
  if (!code.includes('formatDuration')) {
    code = code.replace(
      "import { ClipboardList, Plus",
      "import { formatDuration } from '../utils/formatters.ts';\nimport { ClipboardList, Plus"
    );
  }
  code = code.replace('{wo.estimated_hours}h', "{formatDuration(wo.estimated_hours, 'h')}");
  fs.writeFileSync('src/pages/WorkOrdersPage.tsx', code, 'utf8');
  console.log('Updated WorkOrdersPage.tsx');
}

// 5. MachineDetailModal.tsx
{
  let code = fs.readFileSync('src/components/MachineDetailModal.tsx', 'utf8');
  if (!code.includes('formatDuration')) {
    code = code.replace(
      "import { X, Cpu, Activity",
      "import { formatDuration, formatNumber } from '../utils/formatters.ts';\nimport { X, Cpu, Activity"
    );
  }
  code = code.replace('Est: {wo.estimated_hours}h', "Est: {formatDuration(wo.estimated_hours, 'h')}");
  fs.writeFileSync('src/components/MachineDetailModal.tsx', code, 'utf8');
  console.log('Updated MachineDetailModal.tsx');
}

console.log('All page formatters applied successfully!');
