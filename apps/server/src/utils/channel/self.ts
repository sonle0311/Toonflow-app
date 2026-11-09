import type {
  AuthenticatedOptions, Captcha, Channel, ChannelCapabilities, CreateSubAccountParams, ExploreDetail, ExplorePage, ExploreParams,
  ExploreProcess, ExploreSubmission, ExploreUploadSignature, ExploreUploadSignatureParams, ForgotPasswordParams, HomeAdvertisements,
  Login, LoginParams, ModelData, ModelDataParams, PluginExistence, PluginIdentity, PluginsParams, PluginUploadSignature,
  PluginUploadSignatureParams, PointsConsumption, PointsConsumptionParams, PreviewData, ProviderSources, RegisterParams,
  RequestOptions, SmsParams, Sponsor, SubAccountsPage, SubAccountsParams, TaskRecordsPage, TaskRecordsParams, UpdatePluginParams,
  UploadExploreProjectParams, UploadPluginParams, UsageStatistics, UsageStatisticsParams, WalletActivity, WalletBonusBatchesPage,
  WalletBonusBatchesParams, WalletOrdersPage, WalletOrdersParams, WalletPayment, WalletPaymentParams, WalletPaymentStatus,
  WalletPlan, WalletPresentation,
} from "./types";

/** ACT: Kênh tự chủ cho bản phát hành độc lập — không gọi hạ tầng Toonflow. */
function unsupported(feature: string): never {
  throw Object.assign(new Error(`Tính năng "${feature}" chưa được cấu hình cho kênh tự chủ`), { status: 501 });
}

/**
 * Kênh mặc định của bản độc lập.
 * - Quảng cáo, khám phá, nhà tài trợ: trả rỗng để giao diện không gọi mạng ngoài.
 * - Tài khoản, ví, marketplace: 501 cho tới khi market service được nối vào.
 */
export class Self implements Channel {
  readonly id = "self";

  readonly capabilities: ChannelCapabilities = { account: false, marketplace: false, explore: false, ads: false };

  async getAdvertisements(): Promise<HomeAdvertisements> {
    return { banner: null, banners: [], bannerMode: "carousel", bannerInterval: 5, sidebar: [] };
  }

  async getExploreProjects(): Promise<ExplorePage> {
    return { categories: [], list: [], nextCursor: null };
  }

  async getExploreProject(): Promise<ExploreDetail> {
    unsupported("khám phá dự án");
  }

  async getExploreProcess(): Promise<ExploreProcess> {
    unsupported("khám phá dự án");
  }

  async getExploreDownload(): Promise<{ downloadUrl: string }> {
    unsupported("khám phá dự án");
  }

  async getExploreUploadSignature(): Promise<ExploreUploadSignature> {
    unsupported("đăng dự án cộng đồng");
  }

  async uploadExploreProject(): Promise<ExploreSubmission> {
    unsupported("đăng dự án cộng đồng");
  }

  async getSponsorList(): Promise<Sponsor[]> {
    return [];
  }

  async getCaptcha(): Promise<Captcha> {
    unsupported("đăng nhập Toonflow");
  }

  async sendSmsCode(): Promise<number> {
    unsupported("đăng nhập Toonflow");
  }

  async register(): Promise<{ userCode: string }> {
    unsupported("đăng ký Toonflow");
  }

  async login(): Promise<Login> {
    unsupported("đăng nhập Toonflow");
  }

  async forgotPassword(): Promise<string> {
    unsupported("khôi phục mật khẩu Toonflow");
  }

  async getPlugins(): Promise<{ list: never[]; total: number }> {
    return { list: [], total: 0 };
  }

  async getPluginExistence(): Promise<PluginExistence[]> {
    return [];
  }

  async toggleCollection(): Promise<{ collected: boolean }> {
    unsupported("plugin market");
  }

  async getPluginUploadSignature(): Promise<PluginUploadSignature> {
    unsupported("plugin market");
  }

  async uploadPlugin(): Promise<string> {
    unsupported("plugin market");
  }

  async updatePlugin(): Promise<string> {
    unsupported("plugin market");
  }

  async deletePlugin(): Promise<string> {
    unsupported("plugin market");
  }

  async getPreviewData(): Promise<PreviewData> {
    unsupported("tài khoản Toonflow");
  }

  async getUsageStatistics(): Promise<UsageStatistics> {
    unsupported("tài khoản Toonflow");
  }

  async getTaskRecords(): Promise<TaskRecordsPage> {
    unsupported("tài khoản Toonflow");
  }

  async getPointsConsumption(): Promise<PointsConsumption> {
    unsupported("tài khoản Toonflow");
  }

  async getSubAccounts(): Promise<SubAccountsPage> {
    unsupported("tài khoản Toonflow");
  }

  async createSubAccount(): Promise<void> {
    unsupported("tài khoản Toonflow");
  }

  async removeSubAccount(): Promise<void> {
    unsupported("tài khoản Toonflow");
  }

  async getWalletOrders(): Promise<WalletOrdersPage> {
    unsupported("ví Toonflow");
  }

  async getWalletPlans(): Promise<WalletPlan[]> {
    unsupported("ví Toonflow");
  }

  async getWalletPresentation(): Promise<WalletPresentation> {
    unsupported("ví Toonflow");
  }

  async getWalletActivity(): Promise<WalletActivity> {
    unsupported("ví Toonflow");
  }

  async getWalletBonusBatches(): Promise<WalletBonusBatchesPage> {
    unsupported("ví Toonflow");
  }

  async exchangeWalletCode(): Promise<void> {
    unsupported("ví Toonflow");
  }

  async createWalletPayment(): Promise<WalletPayment> {
    unsupported("ví Toonflow");
  }

  async getWalletPaymentStatus(): Promise<WalletPaymentStatus> {
    unsupported("ví Toonflow");
  }

  async getModelData(): Promise<ModelData[]> {
    return [];
  }

  async getProviderSource(): Promise<ProviderSources> {
    unsupported("nguồn model Toonflow");
  }
}
