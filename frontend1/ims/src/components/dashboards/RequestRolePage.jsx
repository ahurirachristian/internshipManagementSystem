import DashboardLayout from '../DashboardLayout';
import RequestRoleSection from './RequestRoleSection';

export default function RequestRolePage() {
  return (
    <DashboardLayout
      title="Request a Role"
      subtitle="Ask an administrator to change your role"
      searchable={false}
    >
      <RequestRoleSection />
    </DashboardLayout>
  );
}
