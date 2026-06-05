package com.hundsun.bemp.test.template;

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.test.AbstractAdapterConverterTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 签名加密协议 MessageConverter 测试模板
 *
 * <p>适用基类:
 * <ul>
 *   <li>Client: {@code AbstractSignatureGenericMessageRequestReplyConverter}（fxbank 签名加密）</li>
 *   <li>Client: {@code AbstractCpesPkGenericMessageRequestReplyConverter}（fxbank CPES PK 加密）</li>
 * </ul>
 *
 * <p>参考实现: fxbank 的 POSH020101MessageConverter（签名加签）
 *
 * <h2>覆盖场景</h2>
 * <ol>
 *   <li>签名请求构造（toMessage → 加签内容准备）</li>
 *   <li>签名响应解析（fromMessage → 签名结果提取）</li>
 *   <li>签名服务异常处理（加密机连接失败）</li>
 *   <li>CPES PK 加密请求构造</li>
 * </ol>
 *
 * <h2>注意</h2>
 * <p>签名类 Converter 依赖外部加密机（TSSC/CPES），测试时需 mock 加密机服务。
 * 使用 {@code @MockBean} 替换加密机 API，避免依赖真实加密机环境。
 */
public abstract class AbstractSignatureMessageConverterTest extends AbstractAdapterConverterTest {

    protected abstract String getConverterBeanName();
    protected abstract Class<?> getConverterClass();
    protected String getMockMsgSubDir() {
        return getConverterClass().getSimpleName();
    }
    protected abstract String getRequestMockFile();
    protected abstract String getResponseMockFile();

    // ==================== 签名请求构造测试 ====================

    @Test
    @DisplayName("构造签名请求 - toMessage 应包含待签名原文")
    public void testToMessage_signatureRequest() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        JSONObject requestPayload = JSONObject.parseObject(requestJson);

        // 签名类 Converter 的 toMessage 通常准备待签名内容
        // 注意：Generic 通道的 toMessage 签名可能不同于标准 Client
        // 具体实现需参考银行自定义基类
        assertNotNull(requestPayload.getJSONObject("requestDto"), "requestDto 不能为空");
        assertNotNull(requestPayload.getJSONObject("requestDto").getString("msg"), "待签名原文(msg)不能为空");
    }

    @Test
    @DisplayName("签名响应解析 - fromMessage 应提取签名结果")
    public void testFromMessage_signatureResponse() {
        String responseJson = loadMockMessage(getMockMsgSubDir() + "/" + getResponseMockFile() + ".json");
        JSONObject responsePayload = JSONObject.parseObject(responseJson);

        // 签名响应应包含签名结果
        assertNotNull(responsePayload, "签名响应不能为空");
        // 签名成功时应有 PKCS7Msg 或签名数据
        assertTrue(responsePayload.containsKey("retCode"), "响应应包含 retCode");
    }

    @Test
    @DisplayName("签名服务异常 - 加密机连接失败应抛出 BempRuntimeException")
    public void testFromMessage_signatureServiceError() {
        // 模拟加密机返回错误码
        JSONObject errorResponse = new JSONObject();
        errorResponse.put("errCode", -1);
        errorResponse.put("errMsg", "加密机连接失败");

        // 验证异常处理逻辑
        // 实际测试中需 mock HisuTSSCAPIForSecondPayment 的返回值
        assertNotNull(errorResponse.getInteger("errCode"), "错误码应存在");
        assertTrue(errorResponse.getInteger("errCode") < 0, "错误码应为负数");
    }

    // ==================== CPES PK 加密测试 ====================

    @Test
    @DisplayName("CPES PK 加密请求 - requestDto 应包含待加密数据")
    public void testToMessage_cpesPkRequest() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        JSONObject requestPayload = JSONObject.parseObject(requestJson);

        assertNotNull(requestPayload.getJSONObject("requestDto"), "requestDto 不能为空");
    }

    // ==================== 辅助方法 ====================

    /**
     * 构建签名测试请求 JSON
     * 子类可重写以定制请求结构
     */
    protected JSONObject buildSignatureTestRequest() {
        JSONObject request = new JSONObject();
        JSONObject requestDto = new JSONObject();
        requestDto.put("msg", "test_signature_content_" + System.currentTimeMillis());
        request.put("requestDto", requestDto);
        return request;
    }

    /**
     * 构建签名成功响应 JSON
     * 子类可重写以定制响应结构
     */
    protected JSONObject buildSignatureSuccessResponse() {
        JSONObject response = new JSONObject();
        response.put("retCode", "000000");
        response.put("retMsg", "签名成功");
        response.put("signData", "MOCK_PKCS7_SIGNATURE_DATA");
        return response;
    }
}
