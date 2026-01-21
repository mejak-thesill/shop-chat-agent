# Code Structure Guide

## Frontend (Shopify App)

app/
- chat.jsx  
  → Chat UI and message rendering
- app_analytics.tsx  
  → Admin analytics dashboard
- api/
  → Shopify webhooks and API routes

extensions/chat-bubble/
- chat.js  
  → Embedded storefront chat widget
- chat.css  
  → Widget styling

## Backend Services

services/
- claude.server.js  
  → AI interaction logic
- tool.server.js  
  → Add-to-cart, checkout tools
- streaming.server.js  
  → Streaming AI responses

## AWS Lambda Functions

assistant_tracking.py  
→ Receives frontend tracking events  
→ Inserts into AssistantEvent  

shopify_webhook.py  
→ Receives Shopify webhooks  
→ Stores raw events  
→ Stores structured order attribution  

assistant_analytics_metrics_fetch.py  
→ Reads AssistantEvent  
→ Calculates analytics and deltas
