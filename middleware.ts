import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isApi = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isApi(req)) await auth.protect(); // API only works for logged-in users
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|mp4|webm)).*)",
    "/(api|trpc)(.*)",
  ],
};
