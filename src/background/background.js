let inactiveTabsData = {};
let inactiveThreshold = 10; // 默认10秒

// 初始化配置
chrome.storage.local.get(['inactiveThreshold'], (result) => {
  if (result.inactiveThreshold) {
    inactiveThreshold = result.inactiveThreshold;
  }
});

// 监听标签页激活事件
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabs = await chrome.tabs.query({});
  const currentTime = Date.now();

  tabs.forEach(tab => {
    if (tab.id !== activeInfo.tabId) {
      if (!inactiveTabsData[tab.id]) {
        inactiveTabsData[tab.id] = {
          title: tab.title,
          url: tab.url,
          inactiveFrom: currentTime
        };
      }
    } else {
      delete inactiveTabsData[tab.id];
    }
  });

  // 保存数据
  saveInactiveTabsData();
});

// 定期检查并更新未激活标签数据
setInterval(async () => {
  const currentTime = Date.now();
  const inactiveThresholdMs = inactiveThreshold * 1000;

  Object.entries(inactiveTabsData).forEach(([tabId, data]) => {
    if (currentTime - data.inactiveFrom >= inactiveThresholdMs) {
      // 更新存储
      saveInactiveTabsData();
    }
  });
}, 1000);

function saveInactiveTabsData() {
  chrome.storage.local.set({ inactiveTabsData });
} 