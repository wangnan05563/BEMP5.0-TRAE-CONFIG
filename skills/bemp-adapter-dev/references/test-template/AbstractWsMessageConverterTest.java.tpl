package com.hundsun.bemp.test.template;

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.test.AbstractAdapterConverterTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;

import static org.junit.jupiter.api.Assertions.*;

/**
 * WebService/SOAP 协议 MessageConverter 测试模板
 *
 * <p>适用基类:
 * <ul>
 *   <li>Server: {@code AbstractSpringWsMessageApplyResponseConverter}</li>
 *   <li>Client: {@code AbstractWsMessageRequestReplyConverter}</li>
 * </ul>
 *
 * <p>参考实现: xzhbank 的 WS 类 Converter
 *
 * <h2>WS/SOAP 与 XML 的关键差异</h2>
 * <ul>
 *   <li>WS 使用 SOAP 信封（Envelope > Header > Body），而非裸 XML</li>
 *   <li>Server 端通过 WSDL 定义路由（getWsdlDefinition），非 getFunctionIdMapping</li>
 *   <li>Client 端通过 Spring-WS 的 WebServiceTemplate 发送，非 MessageChannel</li>
 *   <li>请求/应答均为 SOAP 格式，需解析 SOAP Body 内的业务节点</li>
 * </ul>
 *
 * <h2>覆盖场景</h2>
 * <ol>
 *   <li>SOAP 请求报文解析（Envelope > Body > 业务节点）</li>
 *   <li>SOAP 响应报文构造（含 SOAP 信封）</li>
 *   <li>WSDL 路由配置验证</li>
 *   <li>SOAP Fault 异常处理</li>
 * </ol>
 */
public abstract class AbstractWsMessageConverterTest extends AbstractAdapterConverterTest {

    protected abstract String getConverterBeanName();
    protected abstract Class<?> getConverterClass();
    protected String getMockMsgSubDir() {
        return getConverterClass().getSimpleName();
    }
    protected abstract String getRequestMockFile();
    protected abstract String getResponseMockFile();

    /** SOAP 信封命名空间 */
    protected static final String SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/";

    // ==================== Server 端 fromMessage 测试 ====================

    @Test
    @DisplayName("解析正常 SOAP 请求报文（Envelope > Body > 业务节点）")
    public void testFromMessage_normalSoapRequest() {
        String soapRequest = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".xml");
        Message<?> message = buildXmlMessage(soapRequest);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessage(converter, message);
        assertNotNull(result, "fromMessage 返回 null");

        JSONObject requestDto = result.getJSONObject("requestDto");
        assertNotNull(requestDto, "requestDto 为空");
    }

    @Test
    @DisplayName("异常分支: SOAP Body 为空容错")
    public void testFromMessage_emptySoapBody() {
        String emptyBodySoap = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<soapenv:Envelope xmlns:soapenv=\"" + SOAP_NS + "\">\n" +
            "  <soapenv:Header/>\n" +
            "  <soapenv:Body/>\n" +
            "</soapenv:Envelope>";
        Message<?> message = buildXmlMessage(emptyBodySoap);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        try {
            JSONObject result = invokeFromMessage(converter, message);
            // 允许返回含错误码的 JSONObject
            if (result != null) {
                // 空 Body 不应导致正常返回码
                assertNotEquals("000000", result.getString("retCode"),
                    "空 SOAP Body 不应返回成功");
            }
        } catch (Exception e) {
            // 允许抛出业务异常
            assertFalse(e.getCause() instanceof NullPointerException,
                "空 SOAP Body 不应导致 NullPointerException");
        }
    }

    // ==================== Server 端 toMessage 测试 ====================

    @Test
    @DisplayName("构造正常 SOAP 响应报文（含 SOAP 信封）")
    public void testToMessage_normalSoapResponse() {
        String soapRequest = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".xml");
        Message<?> applyMessage = buildXmlMessage(soapRequest);

        JSONObject serviceResponse = new JSONObject();
        serviceResponse.put("retCode", "000000");
        serviceResponse.put("retMsg", "成功");

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        Message<?> result = invokeToMessage(converter, applyMessage, serviceResponse);
        assertNotNull(result, "toMessage 返回 null");

        String payload = result.getPayload().toString();
        assertTrue(payload.contains("Envelope") || payload.contains("retCode"),
            "SOAP 响应应包含 Envelope 或 retCode");
    }

    // ==================== WSDL 路由验证 ====================

    @Test
    @DisplayName("WSDL 路由: getWsdlDefinition 配置正确")
    public void testGetWsdlDefinition() {
        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        try {
            Object wsdlDef = converter.getClass()
                .getMethod("getWsdlDefinition")
                .invoke(converter);
            assertNotNull(wsdlDef, "getWsdlDefinition 不应返回 null");
        } catch (NoSuchMethodException e) {
            // 非 WS 基类无此方法，跳过
        } catch (Exception e) {
            fail("调用 getWsdlDefinition 失败: " + e.getMessage());
        }
    }

    // ==================== SOAP Fault 测试 ====================

    @Test
    @DisplayName("异常分支: SOAP Fault 响应处理")
    public void testFromMessage_soapFault() {
        String faultSoap = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<soapenv:Envelope xmlns:soapenv=\"" + SOAP_NS + "\">\n" +
            "  <soapenv:Body>\n" +
            "    <soapenv:Fault>\n" +
            "      <faultcode>soapenv:Server</faultcode>\n" +
            "      <faultstring>Internal Server Error</faultstring>\n" +
            "    </soapenv:Fault>\n" +
            "  </soapenv:Body>\n" +
            "</soapenv:Envelope>";
        Message<?> message = buildXmlMessage(faultSoap);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        try {
            JSONObject result = invokeFromMessage(converter, message);
            if (result != null) {
                assertNotEquals("000000", result.getString("retCode"),
                    "SOAP Fault 不应返回成功");
            }
        } catch (Exception e) {
            // SOAP Fault 允许抛出异常
            assertFalse(e.getCause() instanceof NullPointerException);
        }
    }

    // ==================== 反射调用 ====================

    private JSONObject invokeFromMessage(Object converter, Message<?> message) {
        try {
            return (JSONObject) converter.getClass()
                .getMethod("fromMessage", Message.class)
                .invoke(converter, message);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("fromMessage 调用失败: " + cause.getMessage(), cause);
        }
    }

    private Message<?> invokeToMessage(Object converter, Message<?> applyMessage, JSONObject response) {
        try {
            return (Message<?>) converter.getClass()
                .getMethod("toMessage", Message.class, JSONObject.class)
                .invoke(converter, applyMessage, response);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("toMessage 调用失败: " + cause.getMessage(), cause);
        }
    }
}
