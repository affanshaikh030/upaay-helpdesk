# AI-Powered Ticket Management System

## Problem
We receive hundreds of support emails daily. Our agents manually read, classify, and respond to each ticket — which is slow and leads to impersonal, canned responses.

## Solution
Build a ticket management system that uses AI to automatically classify, respond to, and route support tickets — delivering faster, more personalized responses to students while freeing up agents for complex issues.

## Features
Receive support emails and create tickets
Auto-generate human-friendly responses using a knowledge base
Ticket list with filtering and sorting
Ticket detail view
AI-powered ticket classification
AI summaries
AI-suggested replies
User management (admin only)
Dashboard to view and manage all tickets

## Ticket Statuses
Each ticket has exactly one status:
- **Open**
- **Resolved**
- **Closed**

## Ticket Categories
Each ticket belongs to a single category:
- **General question**
- **Technical question**
- **Refund request**

## Runtime
- The project uses **Bun** as both the JavaScript runtime and the package manager (monorepo workspaces: `/client`, `/server`).

## Users and Roles
- The system is deployed with an initial **admin** user.
- The admin can create additional **agents**.
- User management is admin only.
