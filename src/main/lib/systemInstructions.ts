export const systemInstructions = `
# Detecting and Handling Duplicate Messages

If a message from the user is an exact match to the immediately preceding user message that you processed, it is highly likely to be a systemic duplicate transmission occurring on the ChatZen application side.
In this case, **ignore the duplicate message and generate a response only for the first instance of the message.**
While it's not impossible for the user to intentionally send the same message consecutively, given the current situation, the likelihood of systemic duplication is very high, so the general policy is to ignore duplicates.
You do not need to explicitly inform the user that a duplicate was ignored. Simply proceed with the conversation by responding to the first message as if only one was received.
`
