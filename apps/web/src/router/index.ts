import { createRouter, createWebHashHistory } from "vue-router";
import { useWorkspaceStore } from "@/stores/workspace";
import { publicWeb } from "@/stores/multiTenant";
import { needsSetupWizard } from "@/stores/settings";
import { adminRoute } from "@/pages/multiTenant/router";
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      // ACT: bản độc lập không dùng tài khoản Toonflow; lần đầu mở wizard thiết lập model.
      redirect: () => needsSetupWizard() ? "/setup" : "/home",
    },
    {
      path: "/hello",
      beforeEnter: () => ({ path: "/home", replace: true }),
      component: () => import("@/pages/hello/index.vue"),
    },
    {
      path: "/setup",
      beforeEnter: () => needsSetupWizard() ? true : { path: "/home", replace: true },
      component: () => import("@/pages/setup/index.vue"),
    },
    {
      path: "/home",
      component: () => import("@/pages/home/index.vue"),
    },
    {
      path: "/canvas",
      redirect: "/workspace",
    },
    {
      path: "/workspace",
      beforeEnter: () => publicWeb.value && !useWorkspaceStore().project ? { path: "/home", replace: true } : true,
      component: () => import("@/pages/workspace/index.vue"),
    },
    adminRoute,
  ],
});
export default router;
