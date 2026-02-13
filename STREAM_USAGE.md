# 流式输出使用指南

## 后端 API

### 启用流式模式

在请求头中添加 `x-enable-stream: true`：

```typescript
POST /api/generate
Headers:
  x-user-openid: xxx
  x-enable-stream: true  // 启用流式输出
```

### 事件格式

服务端通过 SSE (Server-Sent Events) 推送进度事件：

```typescript
interface ProgressEvent {
  type: 'step_start' | 'step_progress' | 'step_complete' | 'complete' | 'error';
  step: 'image_parse' | 'copy_rewrite' | 'file_generate';
  progress: number; // 0-100
  data?: any;
  chunk?: string; // AI 生成的文字片段（流式）
  error?: string;
}
```

---

## 前端实现

### 1. Web 端（React / Vue）

```typescript
import { useState } from 'react';

interface GenerateOptions {
  imageUrls: string[];
  subject: string;
  level: string;
  format: string;
  detail_level: string;
  max_length: number;
}

function useStreamGenerate() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [aiThinking, setAiThinking] = useState(''); // AI 思考过程
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async (options: GenerateOptions) => {
    setLoading(true);
    setProgress(0);
    setAiThinking('');
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-openid': 'your-openid',
          'x-enable-stream': 'true', // 启用流式
        },
        body: JSON.stringify(options),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // 保留未完成的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const event = JSON.parse(line.slice(6));
            handleProgressEvent(event);
          }
        }
      }
    } catch (error) {
      console.error('Generate error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressEvent = (event: any) => {
    setProgress(event.progress);

    switch (event.type) {
      case 'step_start':
        setCurrentStep(getStepName(event.step));
        console.log(`开始：${getStepName(event.step)}`);
        break;

      case 'step_progress':
        // 🔥 核心：实时追加 AI 生成的文字
        if (event.chunk) {
          setAiThinking((prev) => prev + event.chunk);
        }
        break;

      case 'step_complete':
        console.log(`完成：${getStepName(event.step)}`);
        if (event.step === 'image_parse' && event.data?.extracted_text) {
          console.log('提取的文字:', event.data.extracted_text);
        }
        break;

      case 'complete':
        console.log('全部完成');
        setResult(event.data);
        break;

      case 'error':
        console.error('错误:', event.error);
        break;
    }
  };

  const getStepName = (step: string) => {
    const names: Record<string, string> = {
      image_parse: '解析图片中...',
      copy_rewrite: 'AI 正在思考...',
      file_generate: '生成文件中...',
    };
    return names[step] || step;
  };

  return { progress, currentStep, aiThinking, result, loading, generate };
}

// ========== 使用示例 ==========
function App() {
  const { progress, currentStep, aiThinking, result, loading, generate } = useStreamGenerate();

  const handleGenerate = () => {
    generate({
      imageUrls: ['https://example.com/image.jpg'],
      subject: '语文',
      level: '小学',
      format: 'markdown',
      detail_level: 'high',
      max_length: 500,
    });
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        开始生成
      </button>

      {loading && (
        <div>
          <p>进度: {progress}%</p>
          <p>{currentStep}</p>
          
          {/* 🔥 实时展示 AI 思考过程 */}
          <div className="ai-thinking">
            <h3>AI 正在思考...</h3>
            <pre>{aiThinking}</pre>
          </div>
        </div>
      )}

      {result && (
        <div>
          <h3>生成完成！</h3>
          <p>点评: {result.articles[0].review}</p>
        </div>
      )}
    </div>
  );
}
```

---

### 2. 微信小程序

```typescript
// pages/generate/index.ts
Page({
  data: {
    progress: 0,
    currentStep: '',
    aiThinking: '', // AI 思考过程
    result: null,
    loading: false,
  },

  async onGenerate() {
    this.setData({ loading: true, progress: 0, aiThinking: '', result: null });

    const requestTask = wx.request({
      url: 'https://your-api.com/api/generate',
      method: 'POST',
      header: {
        'content-type': 'application/json',
        'x-user-openid': 'your-openid',
        'x-enable-stream': 'true', // 启用流式
      },
      data: {
        imageUrls: ['https://example.com/image.jpg'],
        subject: '语文',
        level: '小学',
        format: 'markdown',
        detail_level: 'high',
        max_length: 500,
      },
      enableChunked: true, // 启用分块传输
      success: (res) => {
        console.log('请求完成', res);
      },
      fail: (err) => {
        console.error('请求失败', err);
        this.setData({ loading: false });
      },
    });

    let buffer = '';

    // 🔥 监听数据传输进度
    requestTask.onChunkReceived((res) => {
      const text = this.arrayBufferToString(res.data);
      buffer += text;

      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      lines.forEach((line) => {
        if (line.startsWith('data: ')) {
          const event = JSON.parse(line.slice(6));
          this.handleProgressEvent(event);
        }
      });
    });
  },

  handleProgressEvent(event: any) {
    this.setData({ progress: event.progress });

    switch (event.type) {
      case 'step_start':
        this.setData({ currentStep: this.getStepName(event.step) });
        break;

      case 'step_progress':
        // 🔥 实时追加 AI 生成的文字
        if (event.chunk) {
          this.setData({
            aiThinking: this.data.aiThinking + event.chunk,
          });
        }
        break;

      case 'step_complete':
        console.log(`完成：${this.getStepName(event.step)}`);
        break;

      case 'complete':
        this.setData({ result: event.data, loading: false });
        break;

      case 'error':
        wx.showToast({ title: event.error, icon: 'none' });
        this.setData({ loading: false });
        break;
    }
  },

  getStepName(step: string): string {
    const names: Record<string, string> = {
      image_parse: '解析图片中...',
      copy_rewrite: 'AI 正在思考...',
      file_generate: '生成文件中...',
    };
    return names[step] || step;
  },

  arrayBufferToString(buffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < uint8Array.length; i++) {
      result += String.fromCharCode(uint8Array[i]);
    }
    return result;
  },
});
```

```html
<!-- pages/generate/index.wxml -->
<view class="container">
  <button bindtap="onGenerate" disabled="{{loading}}">开始生成</button>

  <view wx:if="{{loading}}" class="loading-area">
    <progress percent="{{progress}}" />
    <text>{{currentStep}}</text>

    <!-- 🔥 实时展示 AI 思考过程 -->
    <view class="ai-thinking">
      <text class="title">AI 正在思考...</text>
      <text class="content">{{aiThinking}}</text>
    </view>
  </view>

  <view wx:if="{{result}}" class="result">
    <text>生成完成！</text>
    <text>{{result.articles[0].review}}</text>
  </view>
</view>
```

---

## 效果演示

### 流式输出效果（类似 ChatGPT）

```
进度: 25%
AI 正在思考...

{
  "copy": "在一个阳光明媚的早晨，小明背着书包...
```

→ 文字逐字显示

```
进度: 45%
AI 正在思考...

{
  "copy": "在一个阳光明媚的早晨，小明背着书包走在上学的路上。他看到一位老奶奶提着沉重的菜篮子，艰难地走着。小明立刻跑过去...
```

→ 继续追加

```
进度: 80%
AI 正在思考...

{
  "copy": "在一个阳光明媚的早晨，小明背着书包走在上学的路上。他看到一位老奶奶提着沉重的菜篮子，艰难地走着。小明立刻跑过去，主动帮老奶奶拎起菜篮子...",
  "review": "这是一篇记叙文，主题明确..."
}
```

→ 完成

---

## 注意事项

1. **向后兼容**：不加 `x-enable-stream: true` 时，API 返回传统 JSON 响应
2. **超时控制**：SSE 连接可能会超时，建议设置 60s 超时
3. **错误处理**：每个步骤都会捕获错误并通过 `type: 'error'` 推送
4. **取消请求**：前端可以调用 `reader.cancel()` 或 `requestTask.abort()` 中断流

---

## 测试方法

### 使用 curl 测试

```bash
curl -N -H "x-user-openid: test" \
     -H "x-enable-stream: true" \
     -H "Content-Type: application/json" \
     -d '{"imageUrls":["https://example.com/test.jpg"],"subject":"语文","level":"小学","format":"markdown","detail_level":"high","max_length":500}' \
     http://localhost:3000/api/generate
```

你会看到类似的输出：

```
data: {"type":"step_start","step":"image_parse","progress":0}

data: {"type":"step_complete","step":"image_parse","progress":20,"data":{...}}

data: {"type":"step_progress","step":"copy_rewrite","progress":25,"chunk":"在一个"}

data: {"type":"step_progress","step":"copy_rewrite","progress":26,"chunk":"阳光明媚"}

...
```

---

## 优势

✅ **实时反馈** - 用户看到 AI 逐字生成，体验更流畅  
✅ **进度可视化** - 每个步骤的进度都能展示  
✅ **可取消** - 前端可以随时中断请求  
✅ **向后兼容** - 不影响现有的非流式调用  

现在你的 API 就像 ChatGPT 一样了！🚀
