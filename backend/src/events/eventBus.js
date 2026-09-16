const { EventEmitter } = require('events');

class DomainEventBus extends EventEmitter {}

// Singleton event bus instance
const eventBus = new DomainEventBus();

// Increase max listeners if needed
eventBus.setMaxListeners(25);

const DOMAIN_EVENTS = {
  ORDER_STATUS_CHANGED: 'order.status_changed',
  PAYMENT_PROCESSED: 'payment.processed',
};

module.exports = {
  eventBus,
  DOMAIN_EVENTS,
};
