package com.example.demo.aspect;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;
import org.springframework.util.StopWatch;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

@Aspect
@Component
@Slf4j
public class LoggingAspect {

    @Pointcut("within(com.example.demo.controller..*)")
    public void controllerPointcut() {}

    @Around("controllerPointcut()")
    public Object logAround(ProceedingJoinPoint joinPoint) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) return joinPoint.proceed();

        HttpServletRequest request = attributes.getRequest();
        String method = request.getMethod();
        String uri = request.getRequestURI();
        
        // Log Request với tham số đã che
        String params = filterSensitiveParams(request.getParameterMap());
        log.info("▶️ REQUEST | Method: {} | URI: {} | Params: {}", method, uri, params);

        StopWatch stopWatch = new StopWatch();
        stopWatch.start();

        try {
            Object result = joinPoint.proceed();
            return result;
        } finally {
            stopWatch.stop();
            HttpServletResponse response = attributes.getResponse();
            int status = response != null ? response.getStatus() : 0;
            
            // Log Response
            log.info("⏹️ RESPONSE | Status: {} | Time: {}ms | URI: {}", status, stopWatch.getTotalTimeMillis(), uri);
        }
    }

    private String filterSensitiveParams(Map<String, String[]> parameterMap) {
        if (parameterMap == null || parameterMap.isEmpty()) return "[]";
        return parameterMap.entrySet().stream()
                .map(entry -> {
                    String key = entry.getKey();
                    String value = isSensitive(key) ? "[PROTECTED]" : Arrays.toString(entry.getValue());
                    return key + "=" + value;
                })
                .collect(Collectors.joining(", ", "[", "]"));
    }

    private boolean isSensitive(String key) {
        String lowerKey = key.toLowerCase();
        return lowerKey.contains("password") || 
               lowerKey.contains("token") || 
               lowerKey.contains("jwt");
    }
}