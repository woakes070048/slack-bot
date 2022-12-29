import {
  createHandler,
  EventListenerLambda,
  isSlackEventTypeOf,
  SlackEventBridgeEvent,
  SQSEvent,
} from "./lambda";
import { SlackEventHandler } from "../../application/slack-adapter/slack-event-handler";
import { SlackEventType } from "../../domain/slack-adapter/slack-adapter.dto";
import { ConversationEventHandler } from "../../application/slack-adapter/conversation-event-handler";
import { DomainEvent } from "../../domain/bus/event-bus";

class SlackAdapterLambda extends EventListenerLambda<SlackEventBridgeEvent> {
  constructor(
    private readonly slackEventHandler: SlackEventHandler = new SlackEventHandler(),
    private readonly conversationEventHandler: ConversationEventHandler = new ConversationEventHandler()
  ) {
    super({ lambdaName: "SlackAdapterLambda" });
  }

  protected async handleEventBridgeEvent(
    event: SlackEventBridgeEvent
  ): Promise<void> {
    try {
      if (isSlackEventTypeOf(event, SlackEventType.MESSAGE)) {
        await this.slackEventHandler.handleSlackMessageEvent(event.detail);
      } else {
        console.log("unknown type of event");
      }
    } catch (err) {
      // TODO: add better error handling, DLQ etc.
      console.error(
        JSON.stringify({
          ...this.baseProps,
          method: "handleEventBridgeEvent",
          // TODO: add better logger
          err: JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err))),
        })
      );
    }
  }

  protected async handleSQSEvent({ Records }: SQSEvent) {
    try {
      const event: DomainEvent = JSON.parse(Records[0].body);

      await this.conversationEventHandler.handle(event);
    } catch (err) {
      // TODO: add better error handling, DLQ etc.
      console.error(
        JSON.stringify({
          ...this.baseProps,
          method: "handleSQSEvent",
          // TODO: add better logger
          err: JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err))),
        })
      );
    }
  }
}

export const handler = createHandler(new SlackAdapterLambda());