package com.hundsun.bemp.test.template;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.test.AbstractAdapterConverterTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;

import static org.junit.jupiter.api.Assertions.*;

/**
 * XML / SOAP 报文 MessageConverter 测试模板
 *
 * <p>适用基类:
 * <ul>
 *   <li>Server: {@code AbstractSpringWsMessageApplyResponseConverter}</li>
 *   <li>Client: {@code AbstractWsMessageRequestReplyConverter}</li>
 * </ul>
 *
 * <p>参考实现: whnsbank 的 PICE070101MessageConverter
 *
 * <h2>覆盖场景（MUST）</h2>
 * <ol>
 *   <li>正常请求报文解析（字段映射正确）</li>
 *   <li>正常响应报文组装（XML 结构正确）</li>
 *   <li>子节点缺失的容错处理</li>
 *   <li>数组字段的循环解析</li>
 *   <li>ECIF Header 覆盖（tellerNo/orgCode）</li>
 *   <li>报文非法（缺根节点）抛出明确异常</li>
 * </ol>
 *
 * <h2>mock-msg 路径约定</h2>
 * <pre>
 * src/test/resources/mock-msg/&lt;converter-name&gt;/
 *   ├── &lt;bank&gt;_&lt;channel&gt;_&lt;func&gt;_request.xml
 *   └── &lt;bank&gt;_&lt;channel&gt;_&lt;func&gt;_response.xml
 * </pre>
 */
public abstract class AbstractXmlMessageConverterTest extends AbstractAdapterConverterTest {

    /**
     * 被测 Converter 的 bean 名
     * <p>子类必须实现
     */
    protected abstract String getConverterBeanName();

    /**
     * 被测 Converter 的实际类型
     * <p>子类必须实现
     */
    protected abstract Class<?> getConverterClass();

    /**
     * mock-msg 子目录
     * <p>默认使用 Converter 类名作为目录名
     */
    protected String getMockMsgSubDir() {
        return getConverterClass().getSimpleName();
    }

    /**
     * 请求报文文件名（不含后缀，框架自动尝试 .xml）
     * <p>默认: "&lt;bank&gt;_&lt;func&gt;_request"
     */
    protected abstract String getRequestMockFile();

    /**
     * 响应报文文件名（不含后缀）
     */
    protected abstract String getResponseMockFile();

    // ==================== fromMessage 测试 ====================

    @Test
    @DisplayName("正常请求报文解析")
    public void testFromMessage_normalRequest() {
        // 1. 加载 mock 报文
        String requestXml = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".xml");

        // 2. 构造 Spring Message
        Message<?> message = buildXmlMessage(requestXml);

        // 3. 获取 Converter bean（真实 Spring 上下文）
        Object converter = assertConverterBeanExists(getConverterBeanName(), getConverterClass());

        // 4. 执行 fromMessage
        JSONObject result = invokeFromMessage(converter, message);
        assertNotNull(result, "fromMessage 返回 null");

        // 5. 校验基本结构
        JSONObject requestDto = result.getJSONObject("requestDto");
        assertNotNull(requestDto, "requestDto 为空");

        // 6. 由子类实现具体字段映射断言
        assertFromMessageFields(requestDto);
    }

    /**
     * 子类实现: 校验字段映射
     */
    protected abstract void assertFromMessageFields(JSONObject requestDto);

    @Test
    @DisplayName("子节点缺失的容错处理")
    public void testFromMessage_optionalSubNodeMissing() {
        // 构造一个只有必输字段的最小报文（手动构造而不依赖 mock-msg）
        String minimalXml = buildMinimalRequestXml();
        Message<?> message = buildXmlMessage(minimalXml);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessage(converter, message);

        assertNotNull(result, "即使子节点缺失，fromMessage 也应正常返回");
        JSONObject requestDto = result.getJSONObject("requestDto");
        assertNotNull(requestDto, "必输字段缺失时，requestDto 应至少包含主字段");
    }

    /**
     * 子类可覆写: 构造最小报文（用于测试容错）
     * <p>默认只包含根节点和空 body
     */
    protected String buildMinimalRequestXml() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
               "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">\n" +
               "  <soap:Body>\n" +
               "    <request>\n" +
               "      <requestDto></requestDto>\n" +
               "    </request>\n" +
               "  </soap:Body>\n" +
               "</soap:Envelope>";
    }

    @Test
    @DisplayName("报文非法（缺少根节点）应抛异常")
    public void testFromMessage_invalidXml() {
        String invalidXml = "<?xml version=\"1.0\"?><invalid></invalid>";
        Message<?> message = buildXmlMessage(invalidXml);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        // 报文非法应抛明确的运行时异常（不应 silently 返回 null）
        assertThrowsExactly(RuntimeException.class, () -> invokeFromMessage(converter, message));
    }

    // ==================== toMessage 测试 ====================

    @Test
    @DisplayName("正常响应报文组装")
    public void testToMessage_normalResponse() {
        // 1. 构造原始请求报文（用于从 payload 提取 header 节点）
        String requestXml = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".xml");
        Message<?> applyMessage = buildXmlMessage(requestXml);

        // 2. 构造内部服务响应 JSON
        JSONObject serviceResponse = buildServiceResponse();

        // 3. 获取 Converter
        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());

        // 4. 执行 toMessage
        Message<?> result = invokeToMessage(converter, applyMessage, serviceResponse);
        assertNotNull(result, "toMessage 返回 null");

        // 5. 校验响应内容
        Object payload = result.getPayload();
        assertNotNull(payload, "响应 payload 为空");
        String responseXml = payloadToString(payload);
        assertTrue(responseXml.contains("retCode"), "响应报文应包含 retCode");
        assertTrue(responseXml.contains("retMsg"), "响应报文应包含 retMsg");

        // 6. 由子类实现具体响应字段断言
        assertToMessageFields(responseXml);
    }

    /**
     * 子类实现: 构造内部服务响应 JSON
     * <p>示例: {"retCode": "0000", "retMsg": "成功", "retData": [...]}
     */
    protected abstract JSONObject buildServiceResponse();

    /**
     * 子类实现: 校验响应报文字段
     */
    protected abstract void assertToMessageFields(String responseXml);

    @Test
    @DisplayName("空数组响应不应抛异常")
    public void testToMessage_emptyRetData() {
        String requestXml = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".xml");
        Message<?> applyMessage = buildXmlMessage(requestXml);

        JSONObject serviceResponse = new JSONObject();
        serviceResponse.put("retCode", "0000");
        serviceResponse.put("retMsg", "成功");
        // 故意不放 retData

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        Message<?> result = invokeToMessage(converter, applyMessage, serviceResponse);
        assertNotNull(result, "空 retData 不应导致 toMessage 失败");
    }

    // ==================== getFunctionIdMapping 测试（如适用） ====================

    @Test
    @DisplayName("getFunctionIdMapping 配置正确（仅适用于非 WS 基类）")
    public void testGetFunctionIdMapping() {
        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        try {
            // 通过反射调用 getFunctionIdMapping（可能不存在）
            String[] mapping = (String[]) getConverterClass()
                .getMethod("getFunctionIdMapping")
                .invoke(converter);
            if (mapping != null) {
                // 数组最后一个元素必须是 PICE 代码（不是 ECIF 外部服务码）
                assertTrue(mapping.length >= 2, "getFunctionIdMapping 应至少 2 个元素");
                assertTrue(mapping[mapping.length - 1].startsWith("P") || mapping[mapping.length - 1].startsWith("B"),
                    "最后一个元素应为内部功能号（PICE/BICE/BOCE 等），实际: " + mapping[mapping.length - 1]);
            }
        } catch (NoSuchMethodException e) {
            // WS 基类没有 getFunctionIdMapping（路由由 WSDL 接管），跳过即可
        } catch (Exception e) {
            fail("调用 getFunctionIdMapping 失败: " + e.getMessage());
        }
    }

    // ==================== 反射调用辅助方法 ====================

    /**
     * 反射调用 converter.fromMessage(Message)
     * <p>为什么用反射: 父类不强制依赖具体基类（避免与 whnsbank/shangrbank 强耦合）
     */
    private JSONObject invokeFromMessage(Object converter, Message<?> message) {
        try {
            return (JSONObject) getConverterClass()
                .getMethod("fromMessage", Message.class)
                .invoke(converter, message);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("fromMessage 调用失败: " + cause.getMessage(), cause);
        }
    }

    /**
     * 反射调用 converter.toMessage(Message, JSONObject)
     */
    private Message<?> invokeToMessage(Object converter, Message<?> applyMessage, JSONObject response) {
        try {
            return (Message<?>) getConverterClass()
                .getMethod("toMessage", Message.class, JSONObject.class)
                .invoke(converter, applyMessage, response);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("toMessage 调用失败: " + cause.getMessage(), cause);
        }
    }

    /**
     * 把 payload 转字符串（兼容 XmlDocument 和 String 两种类型）
     */
    private String payloadToString(Object payload) {
        if (payload instanceof String) {
            return (String) payload;
        }
        // XmlDocument 需 asXML()
        try {
            return (String) payload.getClass().getMethod("asXML").invoke(payload);
        } catch (Exception e) {
            return payload.toString();
        }
    }
}
