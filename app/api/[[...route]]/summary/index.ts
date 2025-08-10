import byCategory from "./by-category";
import overTime from "./over-time";
import overview from "./overview";

const summary = overview.route("/", overTime).route("/", byCategory);

export default summary;
