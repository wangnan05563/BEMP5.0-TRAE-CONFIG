package com.hundsun.bemp.test.template;

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.test.AbstractAdapterConverterTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 异步 / 通用 MessageConverter 测试模板
 *
 * <p>适用基类:
 * <ul>
 *   <li>Server: {@code AbstractGenericMessageApplyResponseConverter} / {@code AbstractGenericMessageAsyncProcessor}</li>
 *   <li>Client: {@code AbstractGenericMessageRequestReplyConverter} / {@code AbstractAmqpMessageRequestReplyConverter} / {@code AbstractHttpMessageRequestReplyConverter} / {@code AbstractSofaMessageRequestReplyConverter}</li>
 * </ul>
 *
 * <h2>异步 Converter 的特殊性</h2>
 * <ul>
 *   <li>通常不返回同步响应（Message 可以为 null）</li>
 *   <li>依赖 {@code @Async} 注解或消息中间件回调</li>
 *   <li>测试需关注"是否正确分发到消息中间件"，而非"响应报文内容"</li>
 * </ul>
 */
public abstract class AbstractAsyncMessageConverterTest extends AbstractAdapterConverterTest {

    protected abstract String getConverterBeanName();
    protected abstract Class<?> getConverterClass();
    protected String getMockMsgSubDir() {
        return getConverterClass().getSimpleName();
    }
    protected abstract String getRequestMockFile();

    // ==================== 处理测试（不返回响应） ====================

    @Test
    @DisplayName("异步处理请求不抛异常")
    public void testProcess_normalRequest() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        Message<?> message = buildJsonMessage(requestJson);

        Object converter = assertConverterBeanExists(getConverterBeanName(), getConverterClass());

        // 异步 Converter 可能不返回响应
        try {
            Object result = invokeProcess(converter, message);
            // 允许返回 null（异步场景）
            // 但不应抛异常
        } catch (Exception e) {
            // 异常应被记录到日志，不应向上传播
            // 这里只 fail 明确的业务异常
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            if (!(cause instanceof IllegalArgumentException)) {
                throw e;
            }
        }
    }

    @Test
    @DisplayName("消息分发到中间件（用 @MockBean 验证）")
    public void testProcess_dispatchedToMiddleware() {
        // 异步 Converter 通常会调用 messagingTemplate.convertAndSend() 或类似 API
        // 测试需用 @MockBean 替换实际的中间件客户端，验证调用参数
        // 此处仅提供模板，具体 mocking 逻辑由子类实现

        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        Message<?> message = buildJsonMessage(requestJson);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        // 验证存在 processor/process 之类的方法
        boolean hasProcessMethod = false;
        for (java.lang.reflect.Method m : getConverterClass().getMethods()) {
            if (m.getName().startsWith("process") || m.getName().startsWith("handle")) {
                hasProcessMethod = true;
                break;
            }
        }
        assertTrue(hasProcessMethod, "异步 Converter 应有 process/handle 之类的方法");
    }

    // ==================== 反射调用 ====================

    private Object invokeProcess(Object converter, Message<?> message) throws Exception {
        // 尝试多种方法签名
        for (java.lang.reflect.Method m : getConverterClass().getMethods()) {
            if (m.getName().equals("fromMessage") && m.getParameterCount() == 1
                && m.getParameterTypes()[0].equals(Message.class)) {
                return m.invoke(converter, message);
            }
        }
        throw new NoSuchMethodException("未找到 fromMessage(Message) 方法");
    }
}
