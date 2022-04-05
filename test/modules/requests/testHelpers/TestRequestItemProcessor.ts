import {
    AcceptRequestItemParameters,
    GenericRequestItemProcessor,
    RejectRequestItemParameters
} from "@nmshd/consumption"
import { TestRequestItem } from "./TestRequestItem"

export class TestRequestItemProcessor extends GenericRequestItemProcessor<
    TestRequestItem,
    AcceptRequestItemParameters,
    RejectRequestItemParameters
> {}
