import { TicketCategory, TicketStatus } from '@helpdesk/core'

export const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed',
}

export const categoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: 'General question',
  [TicketCategory.TECHNICAL_QUESTION]: 'Technical question',
  [TicketCategory.REFUND_REQUEST]: 'Refund request',
}
