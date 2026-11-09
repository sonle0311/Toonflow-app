import { ref } from "vue";
import axios from "axios";

export type ChannelCapabilities = {
  id: string;
  account: boolean;
  marketplace: boolean;
  explore: boolean;
  ads: boolean;
};

// ACT: Mặc định ẩn các tính năng phụ thuộc kênh; chỉ bật khi server xác nhận.
export const channelCapabilities = ref<ChannelCapabilities>({
  id: "self",
  account: false,
  marketplace: false,
  explore: false,
  ads: false,
});

export async function loadChannelCapabilities() {
  try {
    const { data } = await axios.get<{ code: number; data: ChannelCapabilities }>("/api/channel/capabilities");
    if (data?.data && typeof data.data.id === "string") channelCapabilities.value = { ...channelCapabilities.value, ...data.data };
  } catch {
    // Giữ mặc định an toàn khi server chưa sẵn sàng; lần tải sau sẽ cập nhật.
  }
}
