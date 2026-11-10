package com.example.demo.controller;

import com.example.demo.exception.ConflictException;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.service.SystemConfigService;
import com.example.demo.service.MemberService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm tra GlobalExceptionHandler: mỗi loại lỗi phải trả đúng mã HTTP
 * và lỗi hệ thống không được lộ chi tiết ra client.
 */
@WebMvcTest(GlobalExceptionHandlerTest.ThrowingController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
    GlobalExceptionHandler.class,
    GlobalExceptionHandlerTest.ThrowingController.class
})
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    // Các bean mà @WebMvcTest nạp thêm (filter) và cần dependency.
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private SystemConfigService systemConfigService;

    // ProfileCompletionFilter là component được nạp trong MVC slice.
    @MockitoBean
    private MemberService memberService;

    @Test
    void notFound_Returns404() throws Exception {
        mockMvc.perform(get("/test-errors/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy dữ liệu"));
    }

    @Test
    void unauthorized_Returns401() throws Exception {
        mockMvc.perform(get("/test-errors/unauthorized"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message")
                        .value("Refresh token đã hết hạn. Vui lòng đăng nhập lại."));
    }

    @Test
    void conflict_Returns409() throws Exception {
        mockMvc.perform(get("/test-errors/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email đã được sử dụng!"));
    }

    @Test
    void illegalState_BusinessRule_Returns409() throws Exception {
        mockMvc.perform(get("/test-errors/illegal-state"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Sách này đã hết trên kệ!"));
    }

    @Test
    void illegalArgument_Returns400() throws Exception {
        mockMvc.perform(get("/test-errors/illegal-argument"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Mật khẩu cũ không chính xác."));
    }

    @Test
    void responseStatusException_KeepsItsOwnStatus() throws Exception {
        mockMvc.perform(get("/test-errors/forbidden"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Không được phép"));
    }

    @Test
    void invalidPathVariable_Returns400() throws Exception {
        mockMvc.perform(get("/test-errors/number/abc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unexpectedRuntimeException_Returns500WithoutLeakingDetails() throws Exception {
        mockMvc.perform(get("/test-errors/runtime"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message")
                        .value("Lỗi hệ thống, vui lòng thử lại sau"));
    }

    /** Controller giả chỉ để ném lỗi, không đụng tới service thật. */
    @RestController
    @RequestMapping("/test-errors")
    public static class ThrowingController {

        @GetMapping("/not-found")
        String notFound() {
            throw new ResourceNotFoundException("Không tìm thấy dữ liệu");
        }

        @GetMapping("/unauthorized")
        String unauthorized() {
            throw new UnauthorizedException("Refresh token đã hết hạn. Vui lòng đăng nhập lại.");
        }

        @GetMapping("/conflict")
        String conflict() {
            throw new ConflictException("Email đã được sử dụng!");
        }

        @GetMapping("/illegal-state")
        String illegalState() {
            throw new IllegalStateException("Sách này đã hết trên kệ!");
        }

        @GetMapping("/illegal-argument")
        String illegalArgument() {
            throw new IllegalArgumentException("Mật khẩu cũ không chính xác.");
        }

        @GetMapping("/forbidden")
        String forbidden() {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không được phép");
        }

        @GetMapping("/number/{id}")
        String number(@org.springframework.web.bind.annotation.PathVariable Long id) {
            return String.valueOf(id);
        }

        @GetMapping("/runtime")
        String runtime() {
            throw new RuntimeException("chi tiết nội bộ không được lộ ra ngoài");
        }
    }
}
