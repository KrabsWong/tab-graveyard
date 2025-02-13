let inactiveTabsData = {};
let inactiveThreshold = 10; // 默认10秒

// 获取系统和浏览器信息
chrome.runtime.getPlatformInfo(function (info) {
  console.log('系统信息:', {
    '操作系统': info.os,
    '处理器架构': info.arch
  });
});

// 获取浏览器版本信息
const browserInfo = {
  '名称': 'Chrome',
  '用户代理': navigator.userAgent,
  '版本': navigator.appVersion,
  '语言': navigator.language,
  '平台': navigator.platform
};

console.log('浏览器信息:', browserInfo);

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

// 发送定时网络请求的函数
async function sendPeriodicRequest() {
  const requestUrl = ''
  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inactiveTabsData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('请求成功:', data);
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// 设置10秒间隔的定时器
// setInterval(sendPeriodicRequest, 10000);

// 初始执行一次
// sendPeriodicRequest(); 