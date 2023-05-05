import { testResults } from "../../../data/tests";

export default function handler(req, res) {
  res.status(200).json(testResults);
}
