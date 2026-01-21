# Architecture Diagram

The following diagram describes the main components and data flow.

## Components
- Shopify Storefront
- Chat Widget (Frontend Extension)
- AI Backend (Claude + tools)
- AWS API Gateway
- Lambda Functions
- PostgreSQL Database
- Shopify Webhooks

## Diagram
Import the provided XML file into https://app.diagrams.net to view and edit the diagram.

The diagram shows:
- User → Chat Widget
- Chat Widget → AI Backend
- Event tracking → AssistantEvent table
- Shopify → Webhooks → Order attribution
- Analytics → Admin dashboard
