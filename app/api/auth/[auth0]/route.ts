import { auth0 } from "@/lib/auth0";
import { type NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  return auth0.middleware(req);
};
