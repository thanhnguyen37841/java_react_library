
package com.example.demo.security;

import com.example.demo.service.SystemConfigService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MaintenanceModeFilterTest {

    @Mock
    private SystemConfigService configService;

    @Mock
    private FilterChain filterChain;

    private MaintenanceModeFilter filter;

    @BeforeEach
    void setUp() {
        filter = new MaintenanceModeFilter(configService);
    }

    /**
     * Khi bảo trì được bật, API thông thường phải trả về 503.
     */
    @Test
    void doFilter_WhenMaintenanceEnabledAndNormalApi_Returns503()
            throws ServletException, IOException {

        when(configService.isMaintenanceMode()).thenReturn(true);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("GET");
        request.setServletPath("/api/books");

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertEquals(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                response.getStatus()
        );

        assertTrue(
                MediaType.APPLICATION_JSON.isCompatibleWith(
                        MediaType.parseMediaType(response.getContentType())
                )
        );

        assertEquals(
                StandardCharsets.UTF_8.name(),
                response.getCharacterEncoding()
        );

        String body = response.getContentAsString();

        assertTrue(body.contains("\"status\":503"));
        assertTrue(body.contains("Hệ thống đang bảo trì"));

        verify(configService).isMaintenanceMode();
        verifyNoInteractions(filterChain);
    }

    /**
     * Khi bảo trì được bật, API đăng nhập vẫn phải hoạt động
     * để Admin có thể đăng nhập và tắt chế độ bảo trì.
     */
    @Test
    void doFilter_WhenMaintenanceEnabledAndLoginPost_AllowsRequest()
            throws ServletException, IOException {

        when(configService.isMaintenanceMode()).thenReturn(true);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setServletPath("/auth/login");

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verify(configService).isMaintenanceMode();
        verify(filterChain).doFilter(request, response);

        assertEquals(HttpStatus.OK.value(), response.getStatus());
    }

    /**
     * GET login cũng được phép đi qua khi đang bảo trì.
     */
    @Test
    void doFilter_WhenMaintenanceEnabledAndLoginGet_AllowsRequest()
            throws ServletException, IOException {

        when(configService.isMaintenanceMode()).thenReturn(true);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("GET");
        request.setServletPath("/auth/login");

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verify(configService).isMaintenanceMode();
        verify(filterChain).doFilter(request, response);

        assertEquals(HttpStatus.OK.value(), response.getStatus());
    }

    /**
     * API đăng ký phải bị chặn khi hệ thống đang bảo trì.
     */
    @Test
    void doFilter_WhenMaintenanceEnabledAndRegisterPost_Returns503()
            throws ServletException, IOException {

        when(configService.isMaintenanceMode()).thenReturn(true);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setServletPath("/auth/register");

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertEquals(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                response.getStatus()
        );

        verify(configService).isMaintenanceMode();
        verifyNoInteractions(filterChain);
    }

    /**
     * API tắt bảo trì vẫn được phép đi qua.
     */
    @Test
    void doFilter_WhenMaintenanceEnabledAndConfigApiDisable_AllowsRequest()
            throws ServletException, IOException {

        when(configService.isMaintenanceMode()).thenReturn(true);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("PUT");
        request.setServletPath("/api/configs/maintenance");
        request.setParameter("status", "false");

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verify(configService).isMaintenanceMode();
        verify(filterChain).doFilter(request, response);

        assertEquals(HttpStatus.OK.value(), response.getStatus());
    }

    /**
     * Khi không bật bảo trì, API thông thường hoạt động bình thường.
     */
    @Test
    void doFilter_WhenMaintenanceDisabled_AllowsNormalApi()
            throws ServletException, IOException {

        when(configService.isMaintenanceMode()).thenReturn(false);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("GET");
        request.setServletPath("/api/books");

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verify(configService).isMaintenanceMode();
        verify(filterChain).doFilter(request, response);

        assertEquals(HttpStatus.OK.value(), response.getStatus());
    }
}
