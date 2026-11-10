
package com.example.demo.controller;

import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.service.MemberService;
import com.example.demo.service.SystemConfigService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SystemConfigController.class)
@AutoConfigureMockMvc(addFilters = false)
class SystemConfigControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SystemConfigService configService;

    @MockitoBean
    private MemberService memberService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void getMaintenanceStatus_WhenDisabled_ReturnsFalse() throws Exception {
        when(configService.isMaintenanceMode()).thenReturn(false);

        mockMvc.perform(get("/api/configs/maintenance"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));

        verify(configService).isMaintenanceMode();
    }

    @Test
    void getMaintenanceStatus_WhenEnabled_ReturnsTrue() throws Exception {
        when(configService.isMaintenanceMode()).thenReturn(true);

        mockMvc.perform(get("/api/configs/maintenance"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));

        verify(configService).isMaintenanceMode();
    }

    @Test
    void enableMaintenanceMode_ReturnsSuccessMessage() throws Exception {
        doNothing().when(configService).toggleMaintenanceMode(true);

        mockMvc.perform(put("/api/configs/maintenance")
                        .param("status", "true"))
                .andExpect(status().isOk())
                .andExpect(content().string(
                        "Hệ thống đã BẬT chế độ bảo trì"));

        verify(configService).toggleMaintenanceMode(true);
    }

    @Test
    void disableMaintenanceMode_ReturnsSuccessMessage() throws Exception {
        doNothing().when(configService).toggleMaintenanceMode(false);

        mockMvc.perform(put("/api/configs/maintenance")
                        .param("status", "false"))
                .andExpect(status().isOk())
                .andExpect(content().string(
                        "Hệ thống đã TẮT chế độ bảo trì"));

        verify(configService).toggleMaintenanceMode(false);
    }

    @Test
    void toggleMaintenanceMode_MissingStatus_Returns400() throws Exception {
        mockMvc.perform(put("/api/configs/maintenance"))
                .andExpect(status().isBadRequest());
    }
}
