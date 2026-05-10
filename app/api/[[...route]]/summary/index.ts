import byAccount from "./by-account";
import byCategory from "./by-category";
import byPayee from "./by-payee";
import overTime from "./over-time";
import overview from "./overview";

const summary = overview
  .route("/", overTime)
  .route("/", byCategory)
  .route("/", byPayee)
  .route("/", byAccount);

export default summary;
