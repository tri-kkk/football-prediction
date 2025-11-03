warning: in the working copy of 'next.config.js', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/next.config.js b/next.config.js[m
[1mindex 3afacea..f372bc9 100644[m
[1m--- a/next.config.js[m
[1m+++ b/next.config.js[m
[36m@@ -1,5 +1,11 @@[m
 /** @type {import('next').NextConfig} */[m
 const nextConfig = {[m
[32m+[m[32m  typescript: {[m
[32m+[m[32m    ignoreBuildErrors: true,[m
[32m+[m[32m  },[m
[32m+[m[32m  eslint: {[m
[32m+[m[32m    ignoreDuringBuilds: true,[m
[32m+[m[32m  },[m
   images: {[m
     remotePatterns: [[m
       {[m
[36m@@ -16,16 +22,4 @@[m [mconst nextConfig = {[m
   },[m
 }[m
 [m
[31m-module.exports = nextConfig[m
[31m-[m
[31m-/** @type {import('next').NextConfig} */[m
[31m-const nextConfig = {[m
[31m-  typescript: {[m
[31m-    ignoreBuildErrors: true,[m
[31m-  },[m
[31m-  eslint: {[m
[31m-    ignoreDuringBuilds: true,[m
[31m-  },[m
[31m-}[m
[31m-[m
 module.exports = nextConfig[m
\ No newline at end of file[m
