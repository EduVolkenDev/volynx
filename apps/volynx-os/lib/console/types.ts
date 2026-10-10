/** Shared V1 contract plus UI-only navigation context. */
export type {
  ApiResponse, AuditEvent, BackupCapability, CarePlan, CloudConsoleRole,
  CatalogResponse, CloudCatalog, CloudOverview, CloudStatus, ConsoleContext, Deployment, DomainStatus,
  FailureCode, Incident, ModuleState, Observation, OperationError,
  ProductHealth, ProductIdentity, ResourceHealth, SecurityPosture,
  SupportRequest
} from '../../../../contracts/cloud-console-v1'
export { CLOUD_CONSOLE_CONTRACT_VERSION } from '../../../../contracts/cloud-console-v1'
export { CLOUD_CONSOLE_ROLES, CLOUD_STATUS_VALUES } from '../../../../contracts/cloud-console'

export type TenantContext = { client: string; product: string; env: string }
export type SelectedContext = TenantContext & { clientName: string; productName: string; environmentName: string }
export type DeploymentListData = import('../../../../contracts/cloud-console-v1').Observation & {
  deployments: import('../../../../contracts/cloud-console-v1').Deployment[]
}

export type CatalogEntry = import('../../../../contracts/cloud-console-v1').CloudCatalog['entries'][number]
