import { VercelRequest, VercelResponse } from "@vercel/node";

export default function (req: VercelRequest, res: VercelResponse) {
  res
    .status(404)
    .json("Can't query the root endpoint - try appending a path like /items to the URL!");
}
