import CrmContactCenterIntegrationDesignPage, {
  metadata,
} from "../crm-contact-center-integration-design/page";

const FEEDBACK_URL = "https://forms.gle/FU2wvkb9K8RPVLfU6";

export { metadata };

export default function CrmContactCenterIntegrationBlueprintPage() {
  void FEEDBACK_URL;
  return <CrmContactCenterIntegrationDesignPage />;
}
