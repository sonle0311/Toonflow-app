// Toonflow Vietnamese UI Localization — runtime DOM replacement
(function() {
  "use strict";

  // Chinese → Vietnamese dictionary (simplified, traditional, Japanese variants)
  const DICT = {
    // === Buttons / Actions ===
    "确定": "Xác nhận", "確定": "Xác nhận", "確認": "Xác nhận",
    "取消": "Hủy", "確認取消": "Xác nhận hủy",
    "保存": "Lưu", "儲存": "Lưu", "保存成功": "Đã lưu", "儲存成功": "Đã lưu", "更新成功": "Đã cập nhật",
    "删除": "Xóa", "刪除": "Xóa", "削除": "Xóa", "刪除": "Xóa",
    "删除成功": "Đã xóa", "刪除成功": "Đã xóa", "删除失败": "Xóa thất bại", "刪除失敗": "Xóa thất bại",
    "确认删除": "Xác nhận xóa", "確認刪除": "Xác nhận xóa", "削除の確認": "Xác nhận xóa",
    "删除确认": "Xác nhận xóa", "刪除確認": "Xác nhận xóa",
    "确认清空": "Xác nhận xóa tất cả", "確認清除": "Xác nhận xóa tất cả",
    "批量删除": "Xóa hàng loạt", "批次刪除": "Xóa hàng loạt", "一括削除": "Xóa hàng loạt",
    "批量删除成功": "Đã xóa hàng loạt",
    "删除片段": "Xóa phân đoạn", "删除轨道": "Xóa track",
    "重置": "Đặt lại", "重設": "Đặt lại",
    "复制": "Sao chép", "複製": "Sao chép", "复制成功": "Đã sao chép", "复制链接": "Sao chép link", "复制代码": "Sao chép code",
    "新增": "Thêm mới", "新增成功": "Đã thêm", "添加成功": "Đã thêm",
    "编辑": "Sửa", "編輯": "Sửa", "編集": "Sửa",
    "全选": "Chọn tất cả", "全選": "Chọn tất cả",
    "搜索": "Tìm kiếm", "搜尋": "Tìm kiếm",
    "预览": "Xem trước", "預覽": "Xem trước",
    "关闭": "Đóng", "刷新": "Làm mới", "重新整理": "Làm mới",
    "下一步": "Tiếp theo", "上一步": "Quay lại", "继续": "Tiếp tục",
    "撤销": "Hoàn tác", "重做": "Làm lại",
    "上传图片": "Tải ảnh lên", "上传附件": "Tải tệp lên",
    "上传中": "Đang tải lên", "上传成功": "Tải lên thành công",
    "播放": "Phát", "分享": "Chia sẻ",
    "点击加载更多": "Bấm để tải thêm", "收起": "Thu gọn",
    "选择文件": "Chọn tệp", "请选择": "Vui lòng chọn", "请输入": "Vui lòng nhập",

    // === Status ===
    "生成中": "Đang tạo", "生成中...": "Đang tạo...", "載入中...": "Đang tải...", "加载中": "Đang tải", "加载中...": "Đang tải...",
    "生成失败": "Tạo thất bại", "生成失敗": "Tạo thất bại",
    "生成成功": "Tạo thành công", "已完成": "Hoàn thành", "未生成": "Chưa tạo",
    "等待生成": "Đợi tạo", "已取消生成": "Đã hủy tạo",
    "进行中": "Đang xử lý", "失败": "Thất bại",
    "暂无数据": "Không có dữ liệu", "思考中...": "Đang suy nghĩ...",
    "上传中": "Đang tải lên",

    // === Navigation / Settings ===
    "设置": "Cài đặt", "模型": "Model", "项目": "Dự án",
    "关于": "Giới thiệu", "检查更新": "Kiểm tra cập nhật",
    "通用": "Chung", "高级": "Nâng cao",

    // === Agent labels ===
    "统筹": "Điều phối", "编剧": "Biên kịch", "编辑": "Biên tập",
    "视频策划": "Lập kế hoạch video", "执行导演": "Đạo diễn thực hiện", "监制": "Giám chế",

    // === Production / Pipeline ===
    "分镜": "Phân cảnh", "分镜表": "Bảng phân cảnh", "分镜图": "Ảnh phân cảnh",
    "分镜面板": "Panel phân cảnh", "分镜生成": "Sinh phân cảnh",
    "资产": "Tài sản", "资产信息": "Thông tin tài sản",
    "关联资产": "Tài sản liên kết", "關聯資產": "Tài sản liên kết",
    "暂未关联资产": "Chưa liên kết tài sản", "暫未關聯資產": "Chưa liên kết tài sản",
    "选择关联资产": "Chọn tài sản liên kết", "選擇資產": "Chọn tài sản",
    "选择资产": "Chọn tài sản",
    "关联资产ID": "ID tài sản liên kết",
    "角色": "Nhân vật", "场景": "Bối cảnh", "道具": "Đạo cụ", "小道具": "Đạo cụ",
    "人物": "Nhân vật",
    "提示词": "Prompt", "提示詞": "Prompt",
    "视频提示词": "Prompt video", "视频描述": "Mô tả video",
    "请输入提示词": "Nhập prompt", "請輸入提示詞": "Nhập prompt",
    "提示词生成失败": "Sinh prompt thất bại",
    "批量生成提示词": "Sinh prompt hàng loạt",
    "生成提示词": "Sinh prompt", "生成图片": "Sinh ảnh", "生成视频": "Sinh video",
    "批量生成": "Sinh hàng loạt",
    "重新生成": "Tạo lại",
    "导演规划": "Kế hoạch đạo diễn", "导演": "Đạo diễn",
    "故事骨架": "Khung truyện", "改编策略": "Chiến lược cải biên",
    "剧本": "Kịch bản", "剧本名称": "Tên kịch bản", "剧本内容": "Nội dung kịch bản",
    "请输入剧本名称": "Nhập tên kịch bản",
    "章节名称": "Tên chương", "章节内容": "Nội dung chương",
    "章節名稱": "Tên chương", "章節內容": "Nội dung chương",
    "基于小说原文": "Dựa trên nguyên tác",

    // === Model / Vendor ===
    "供应商": "Provider", "图像模型": "Model ảnh", "视频模型": "Model video",
    "文生视频": "Text → Video", "请选择模型": "Chọn model", "請選擇模型": "Chọn model",
    "请求地址": "Địa chỉ request", "API密钥": "API Key",
    "深度思考": "Suy luận sâu", "温度": "Nhiệt độ", "分辨率": "Độ phân giải", "解析度": "Độ phân giải", "解像度": "Độ phân giải",
    "请选择分辨率": "Chọn độ phân giải", "請選擇解析度": "Chọn độ phân giải", "解像度を選択してください": "Chọn độ phân giải",
    "参考图片": "Ảnh tham chiếu", "音频参考": "Tham chiếu âm thanh",
    "模式": "Chế độ", "文本": "Văn bản", "文字": "Văn bản",

    // === Media types ===
    "图片": "Ảnh", "圖片": "Ảnh", "画像": "Ảnh",
    "视频": "Video", "影片": "Video", "動画": "Video",
    "音频": "Âm thanh", "音訊": "Âm thanh", "音声": "Âm thanh",
    "字幕": "Phụ đề", "素材": "Vật liệu", "贴纸": "Sticker",

    // === Timeline / Effects ===
    "时长": "Thời lượng", "轨道": "Track", "转场": "Chuyển cảnh",
    "淡入": "Fade in", "淡出": "Fade out", "淡入淡出": "Fade in/out",
    "擦除": "Erase", "溶解": "Dissolve", "模糊": "Blur",
    "滤镜": "Filter", "特效": "Hiệu ứng",
    "不透明度": "Độ mờ", "音量": "Âm lượng",
    "缩放": "Thu phóng", "縮放": "Thu phóng", "旋转": "Xoay",
    "半透明": "Bán trong suốt", "分割": "Chia", "分割片段": "Chia phân đoạn",
    "单图": "1 ảnh", "全屏": "Toàn màn hình",

    // === Form / Input ===
    "标题": "Tiêu đề", "名称": "Tên", "描述": "Mô tả",
    "请输入用户名": "Nhập tên đăng nhập", "請輸入使用者名稱": "Nhập tên đăng nhập",
    "请输入密码": "Nhập mật khẩu", "請輸入密碼": "Nhập mật khẩu",
    "可选": "Tùy chọn", "全部": "Tất cả", "当前": "Hiện tại",
    "状态": "Trạng thái", "创建时间": "Thời gian tạo",
    "未命名": "Chưa đặt tên", "性别": "Giới tính",
    "系统预设颜色": "Màu hệ thống", "最近使用颜色": "Màu dùng gần đây",
    "请选择时间": "Chọn thời gian", "选择时间": "Chọn thời gian",

    // === Misc ===
    "上午": "Sáng", "下午": "Chiều",
    "操作": "Thao tác", "预览": "Xem trước",
    "生成结果": "Kết quả", "產生影片": "Tạo video",
    "图片无法显示": "Không hiển thị được ảnh", "图片加载中": "Đang tải ảnh",
    "点赞": "Thích", "点踩": "Không thích",
    "导出失败": "Xuất thất bại", "匯出失敗": "Xuất thất bại",
    "历史版本": "Phiên bản cũ", "开始": "Bắt đầu", "開始": "Bắt đầu",
    "新视觉手册": "Visual manual mới", "新視覺手冊": "Visual manual mới",
    "新しいビジュアルマニュアル": "Visual manual mới",
    "请输入视觉手册名称": "Nhập tên visual manual", "請輸入視覺手冊名稱": "Nhập tên visual manual",
    "関連アセット": "Tài sản liên kết", "削除の確認": "Xác nhận xóa",
    "重新生成": "Tạo lại", "イベント分析": "Phân tích sự kiện", "事件分析": "Phân tích sự kiện",
    "正文卷": "Nội dung chính", "正文本": "Nội dung chính",
    "卷首": "Đầu quyển", "序章": "Lời nói đầu", "终章": "Chương cuối", "番外": "Ngoại truyện",
    "上卷": "Quyển thượng", "下卷": "Quyển hạ", "前传": "Tiền truyện", "后记": "Hậu ký",
    "楔子": "Lời mở đầu", "尾声": "Kết thúc", "完结": "Hoàn",
    "上一页": "Trang trước", "下一页": "Trang sau", "上一年": "Năm trước", "下一年": "Năm sau",
    "首页": "Đầu", "末页": "Cuối", "跳至": "Đi tới",
    "条数据": "mục", "条结果": "kết quả", "条Skill": "Skill", "个表": "bảng",
    "请稍后": "Vui lòng đợi", "请稍后再试": "Vui lòng thử lại sau",
    "发送一条消息开始测试": "Gửi tin nhắn để bắt đầu test",
    "保留最近": "Giữ lại gần đây", "条对话上下文": "ngữ cảnh hội thoại",
    "允许查询已压缩消息条数": "Cho phép truy vấn số tin nhắn đã nén",
    "单次获取未压缩消息条数": "Số tin nhắn chưa nén lấy mỗi lần",
    "搜索记忆条数": "Số trí nhớ tìm kiếm",
    "分镜台": "Bàn phân cảnh", "分镜表": "Bảng phân cảnh", "分镜面板": "Panel phân cảnh",
    "分镜图": "Ảnh phân cảnh", "分镜图片": "Ảnh phân cảnh", "分镜视频": "Video phân cảnh",
    "分镜描述": "Mô tả phân cảnh", "分镜添加失败": "Thêm phân cảnh thất bại",
    "从分镜选择": "Chọn từ phân cảnh", "从分镜列表中选择图片": "Chọn ảnh từ danh sách phân cảnh",
    "从资产选择": "Chọn từ tài sản", "从资产库中选择图片": "Chọn ảnh từ thư viện tài sản",
    "主轨道": "Track chính", "主轨道不能删除": "Không xóa được track chính",
    "删除轨道": "Xóa track", "分辨率": "Độ phân giải",
    "参考图": "Ảnh tham chiếu", "参考图片": "Ảnh tham chiếu", "参考视频": "Video tham chiếu",
    "参考音频": "Âm thanh tham chiếu", "上传参考图片": "Tải ảnh tham chiếu lên",
    "多参考图": "Đa ảnh tham chiếu", "多图参考": "Đa ảnh tham chiếu", "多参考模式": "Chế độ đa tham chiếu",
    "单图参考": "Tham chiếu đơn ảnh", "图片参考": "Tham chiếu ảnh",
    "图片提示词": "Prompt ảnh", "一括生成": "Sinh hàng loạt", "一括生成設定": "Cài đặt sinh hàng loạt",
    "仅通过文本描述生成视频": "Chỉ tạo video bằng văn bản", "以单张参考图片为基础生成视频": "Tạo video từ 1 ảnh tham chiếu",
    "仅输出有声视频": "Chỉ xuất video có âm thanh", "仅输出无声视频": "Chỉ xuất video không âm thanh",
    "全选已生成项": "Chọn tất cả đã tạo", "全选未生成项": "Chọn tất cả chưa tạo",
    "修改提示词成功": "Sửa prompt thành công", "提示词修改": "Sửa prompt",
    "不允许扩展时长": "Không cho phép kéo dài", "不允许收缩时长": "Không cho phép rút ngắn",
    "导演手册": "Manual đạo diễn", "导演规划": "Kế hoạch đạo diễn", "导演计划": "Kế hoạch đạo diễn",
    "新建导演手册": "Tạo manual đạo diễn mới", "编辑导演手册": "Sửa manual đạo diễn",
    "删除导演手册": "Xóa manual đạo diễn", "导演手册提示词": "Prompt manual đạo diễn",

    // === Additional coverage (extracted from bundle, UI-chrome only) ===
    "请输入正确的": "Vui lòng nhập đúng ", "参照画像": "Ảnh tham chiếu",
    "首尾帧": "Khung đầu/cuối", "首帧": "Khung đầu", "尾帧": "Khung cuối",
    "首帧可选": "Khung đầu (tùy chọn)", "尾帧可选": "Khung cuối (tùy chọn)", "首尾影格": "Khung đầu/cuối",
    "已复制": "Đã sao chép", "复制失败": "Sao chép thất bại", "保存失败": "Lưu thất bại", "儲存失敗": "Lưu thất bại",
    "技能管理": "Quản lý Skill", "视频生产": "Sản xuất video", "模型服务": "Dịch vụ model", "文生图": "Text → Ảnh",
    "已选": "Đã chọn", "已選": "Đã chọn", "选择済": "Đã chọn", "選択済": "Đã chọn",
    "事件": "Sự kiện", "已解析": "Đã phân tích",
    "支援": "Hỗ trợ", "選填": "Tùy chọn",
    "劇本": "Kịch bản", "提示詞生成失敗": "Sinh prompt thất bại", "提示詞生成成功": "Sinh prompt thành công",
    "貼紙": "Sticker", "自動": "Tự động", "移行": "Di chuyển", "機能": "Chức năng", "件数": "Số lượng",
    "再接続": "Kết nối lại", "備考": "Ghi chú", "派生": "Phái sinh", "再生速度": "Tốc độ phát",
    "表格": "Bảng", "目录": "Mục lục", "一级标题": "Heading 1", "二级标题": "Heading 2", "三级标题": "Heading 3",
    "饼图": "Biểu đồ tròn", "行内代码": "Code inline", "回転": "Xoay",
    "左对齐": "Căn trái", "居中": "Căn giữa", "右对齐": "Căn phải",
    "加载资产数据失败": "Tải dữ liệu tài sản thất bại",
    "确定要删除轨道": "Xác nhận xóa track", "锁定轨道": "Khóa track", "解锁轨道": "Mở khóa track",
    "添加新的": "Thêm mới", "请填写": "Vui lòng điền", "填入": "Điền vào", "导入": "Nhập",
    "搜索剧本失败": "Tìm kịch bản thất bại", "已清除": "Đã xóa",
    "第X集": "Tập X", "格式拆分": "Tách theo định dạng",
    "請求網址": "Địa chỉ request", "網址": "URL",
    "載入中": "Đang tải", "選擇關聯資產": "Chọn tài sản liên kết",
    "大量生成提示詞": "Sinh prompt hàng loạt", "批次生成": "Sinh hàng loạt",
    "劇本名稱": "Tên kịch bản", "請輸入劇本名稱": "Nhập tên kịch bản", "劇本內容": "Nội dung kịch bản",
    "生成提示詞": "Sinh prompt", "生成圖片": "Sinh ảnh", "名稱": "Tên",
    "歷史版本": "Phiên bản cũ", "濾鏡": "Filter", "進行中": "Đang xử lý",
    "単一画像": "1 ảnh", "複数画像": "Nhiều ảnh", "削除確認": "Xác nhận xóa", "無効": "Không khả dụng",
    "同時実行数": "Số luồng đồng thời", "正規表現": "Biểu thức chính quy",
  };

  // Also translate multi-word phrases (longer matches first to avoid partial replacements)
  const entries = Object.entries(DICT).sort((a, b) => b[0].length - a[0].length);

  function translateText(text) {
    let result = text;
    for (const [zh, vi] of entries) {
      if (result.includes(zh)) {
        result = result.split(zh).join(vi);
      }
    }
    // Regex: Chinese chapter/episode patterns → Vietnamese
    result = result.replace(/第(\d+)章/g, "Chương $1");
    result = result.replace(/第(\d+)集/g, "Tập $1");
    result = result.replace(/第(\d+)回/g, "Hồi $1");
    result = result.replace(/第(\d+)节/g, "Mục $1");
    result = result.replace(/第(\d+)卷/g, "Quyển $1");
    // Chinese numeral chapter patterns
    result = result.replace(/第([一二三四五六七八九十百千零两]+)章/g, "Chương $1");
    result = result.replace(/第([一二三四五六七八九十百千零两]+)集/g, "Tập $1");
    result = result.replace(/第([一二三四五六七八九十百千零两]+)回/g, "Hồi $1");
    // Chinese numeral to Arabic for common numbers in chapter names
    const numMap = {"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10,"十一":11,"十二":12,"十三":13,"十四":14,"十五":15,"十六":16,"十七":17,"十八":18,"十九":19,"二十":20,"二十一":21,"二十二":22,"二十三":23,"二十四":24,"二十五":25,"二十六":26,"二十七":27,"二十八":28,"二十九":29,"三十":30};
    result = result.replace(/Chương ([一二三四五六七八九十百零两]+)/g, (m, n) => "Chương " + (numMap[n] || n));
    result = result.replace(/Tập ([一二三四五六七八九十百零两]+)/g, (m, n) => "Tập " + (numMap[n] || n));
    result = result.replace(/Hồi ([一二三四五六七八九十百零两]+)/g, (m, n) => "Hồi " + (numMap[n] || n));
    // "第N章：" → "Chương N: " (handle colon variants)
    result = result.replace(/Chương (\d+)：/g, "Chương $1: ");
    // Pagination: "X 条/页" → "X mục/trang"
    result = result.replace(/(\d+)\s*条\/页/g, "$1 mục/trang");
    result = result.replace(/(\d+)\s*條\/頁/g, "$1 mục/trang");
    // "共 X 条数据" → "Tổng X mục"
    result = result.replace(/共\s*(\d+)\s*条数据/g, "Tổng $1 mục");
    result = result.replace(/共\s*(\d+)\s*條數據/g, "Tổng $1 mục");
    // "共 X 条，当前显示 Y 条" → "Tổng X, đang hiển thị Y"
    result = result.replace(/共\s*(\d+)\s*条，当前显示\s*(\d+)\s*条/g, "Tổng $1, đang hiển thị $2");
    result = result.replace(/共\s*(\d+)\s*條，當前顯示\s*(\d+)\s*條/g, "Tổng $1, đang hiển thị $2");
    // "共 X 个表" → "Tổng X bảng"
    result = result.replace(/共\s*(\d+)\s*个表/g, "Tổng $1 bảng");
    result = result.replace(/共\s*(\d+)\s*個表/g, "Tổng $1 bảng");
    // "找到 X 条结果" → "tìm thấy X kết quả"
    result = result.replace(/找到\s*(\d+)\s*条结果/g, "tìm thấy $1 kết quả");
    result = result.replace(/找到\s*(\d+)\s*條結果/g, "tìm thấy $1 kết quả");
    // "共 X 个，并发数 Y" → "Tổng X, song song Y"
    result = result.replace(/共\s*(\d+)\s*个，并发数\s*(\d+)/g, "tổng $1, song song $2");
    // "扫描到 X 个" → "quét được X"
    result = result.replace(/扫描到\s*(\d+)\s*个/g, "quét được $1");
    return result;
  }

  // Check if a text node should be translated (skip script/style/textarea/input)
  function shouldTranslate(node) {
    const parent = node.parentNode;
    if (!parent) return false;
    const tag = parent.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "INPUT") return false;
    return true;
  }

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!shouldTranslate(node)) return;
      const original = node.textContent;
      if (!original || !original.trim()) return;
      // Quick check: does it contain any CJK character?
      if (!/[\u4e00-\u9fff\u3040-\u30ff]/.test(original)) return;
      const translated = translateText(original);
      if (translated !== original) {
        node.textContent = translated;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Translate placeholder, title, label attributes
      for (const attr of ["placeholder", "title", "label", "aria-label"]) {
        const val = node.getAttribute(attr);
        if (val && /[\u4e00-\u9fff\u3040-\u30ff]/.test(val)) {
          const translated = translateText(val);
          if (translated !== val) node.setAttribute(attr, translated);
        }
      }
    }
  }

  function walkDOM(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (node.nodeType === Node.TEXT_NODE && shouldTranslate(node)) return NodeFilter.FILTER_ACCEPT;
        if (node.nodeType === Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      }
    });
    const nodes = [];
    let current;
    while ((current = walker.nextNode())) nodes.push(current);
    nodes.forEach(processNode);
  }

  // Initial pass + observe
  function init() {
    walkDOM(document.body);

    // MutationObserver for dynamic content
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
            processNode(node);
            if (node.nodeType === Node.ELEMENT_NODE) walkDOM(node);
          }
        }
        // Also handle text changes
        if (mutation.type === "characterData" && mutation.target.parentNode) {
          processNode(mutation.target);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    console.log("[VI-i18n] Vietnamese localization active — " + Object.keys(DICT).length + " translations");
  }

  // Run when DOM is ready, then again after Vue mounts
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-run after Vue app mounts (delayed)
  setTimeout(init, 2000);
  setTimeout(init, 5000);
})();
