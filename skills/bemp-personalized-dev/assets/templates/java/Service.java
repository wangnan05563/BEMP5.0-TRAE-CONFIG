package com.hundsun.bemp.{BANK_CODE}.biz.sm.service.impl.[模块名];

import com.hundsun.bemp.fw.common.annotation.CustomizedBean;
import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.[模块名].{BANK_CLASS_PREFIX}[服务名]Service;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.[模块名].dto.{BANK_CLASS_PREFIX}[Dto名]Dto;
import com.hundsun.jrescloud.rpc.annotation.CloudComponent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

/**
 * {BANK_NAME}[功能描述]个性化 Service 实现
 * extends产品实现类，需@CustomizedBean替换产品化Bean
 * @author [作者]
 * @date [日期]
 */
@CustomizedBean
@CloudComponent
public class {BANK_CLASS_PREFIX}[原Service名]Impl extends [原Service名]Impl implements {BANK_CLASS_PREFIX}[服务名]Service {
    private static final Logger LOGGER = LoggerFactory.getLogger({BANK_CLASS_PREFIX}[原Service名]Impl.class);

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void [方法名](BaseRequest<{BANK_CLASS_PREFIX}[Dto名]Dto> req) {
        {BANK_CLASS_PREFIX}[Dto名]Dto dto = req.getRequestDto();

        if (dto == null) {
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "请求参数不能为空");
        }

        LOGGER.info("开始执行[方法名]操作，参数：{}", dto);

        // TODO: 实现具体业务逻辑

        LOGGER.info("[方法名]操作完成");
    }
}
