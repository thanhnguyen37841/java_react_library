package com.example.demo.service;

import com.example.demo.entity.SystemConfig;
import com.example.demo.repository.SystemConfigRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private final SystemConfigRepository configRepository;
    
    public static final String MAINTENANCE_KEY = "MAINTENANCE_MODE";
    
    // Biến lưu cache trên RAM, dùng volatile để đảm bảo đồng bộ luồng (Thread-safe)
    private volatile boolean maintenanceMode = false;

    // Chạy 1 lần duy nhất khi Spring Boot khởi động xong
    @PostConstruct
    public void init() {
        maintenanceMode = configRepository.findByConfigKey(MAINTENANCE_KEY)
                .map(config -> Boolean.parseBoolean(config.getConfigValue()))
                .orElse(false);
    }

    // Filter sẽ gọi hàm này (đọc trực tiếp từ RAM, tốc độ O(1), không tốn DB Query)
    public boolean isMaintenanceMode() {
        return maintenanceMode;
    }

    @Transactional
    public void toggleMaintenanceMode(boolean status) {
        SystemConfig config = configRepository
                .findByConfigKey(MAINTENANCE_KEY)
                .orElseGet(() -> {
                    SystemConfig newConfig = new SystemConfig();
                    newConfig.setConfigKey(MAINTENANCE_KEY);
                    return newConfig;
                });

        config.setConfigValue(Boolean.toString(status));
        configRepository.save(config);

        this.maintenanceMode = status;
    }
}