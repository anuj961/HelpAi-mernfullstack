import proxy from "express-http-proxy"

export const proxyWithHeader = (serviceUrl, proxyReqPathResolver) => {
    return proxy(serviceUrl, {
        ...(proxyReqPathResolver ? { proxyReqPathResolver } : {}),
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId
                proxyReqOpts.headers["x-user-instructions"] = srcReq.user.customInstructions || ""
            }
            return proxyReqOpts
        }
    })
}