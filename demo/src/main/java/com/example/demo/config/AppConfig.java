package com.example.demo.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule; // Bổ sung import này
import com.fasterxml.jackson.databind.SerializationFeature; // Bổ sung import này
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        
        // ĐĂNG KÝ MODULE XỬ LÝ NGÀY GIỜ JAVA 8 (LocalDateTime)
        mapper.registerModule(new JavaTimeModule());
        
        // Tắt tính năng ép ngày giờ thành dạng số Timestamp (để nó in ra chuỗi ISO 8601 đẹp mắt)
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        
        return mapper;
    }
}