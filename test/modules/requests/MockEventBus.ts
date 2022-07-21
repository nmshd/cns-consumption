import { Event, EventBus, EventHandler, SubscriptionTarget } from "@js-soft/ts-utils"

export class MockEventBus extends EventBus {
    private readonly _publishedEvents: string[] = []
    public get publishedEvents(): string[] {
        return this._publishedEvents
    }

    public subscribe<TEvent = any>(
        _subscriptionTarget: SubscriptionTarget<TEvent>,
        _handler: EventHandler<TEvent>
    ): number {
        // noop
        return 0
    }

    public subscribeOnce<TEvent = any>(
        _subscriptionTarget: SubscriptionTarget<TEvent>,
        _handler: EventHandler<TEvent>
    ): number {
        // noop
        return 0
    }

    public unsubscribe(_subscriptionId: number): boolean {
        // noop
        return true
    }

    public publish(event: Event): void {
        this._publishedEvents.push(event.namespace)
    }

    public close(): void | Promise<void> {
        this._publishedEvents.splice(0)
    }
}
