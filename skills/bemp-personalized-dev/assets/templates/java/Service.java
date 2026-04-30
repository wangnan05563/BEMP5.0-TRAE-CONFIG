package com.hundsun.bemp.hnnxbank.biz.sm.service.impl.[模块名];

import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.hnnxbank.biz.sm.service.[模块名].Hnnx[服务名]Service;
import com.hundsun.bemp.hnnxbank.biz.sm.service.[模块名].dto.Hnnx[Dto名]Dto;
import com.hundsun.jrescloud.rpc.annotation.CloudComponent;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * [功能描述]
 * @author [作者]
 * @date [日期]
 */
@CloudComponent
public class Hnnx[原Service名]Impl extends [原Service名]Impl implements Hnnx[服务名]Service {
    private static final Logger LOGGER = LoggerFactory.getLogger(Hnnx[原Service名]Impl.class);

    /**
     * [方法描述]
     * @param req 请求参数
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void [方法名](BaseRequest<Hnnx[Dto名]Dto> req) {
        Hnnx[Dto名]Dto dto = req.getRequestDto();

        if (dto == null) {
            throw new BempRuntimeException("请求参数不能为空");
        }

        LOGGER.info("开始执行[方法名]操作，参数：{}", dto);

        // TODO: 实现具体业务逻辑

        LOGGER.info("[方法名]操作完成");
    }
}
