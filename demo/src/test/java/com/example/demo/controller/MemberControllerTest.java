
package com.example.demo.controller;

import com.example.demo.dto.request.MemberRequest;
import com.example.demo.dto.response.MemberResponse;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.service.MemberService;
import com.example.demo.service.SystemConfigService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MemberController.class)
@AutoConfigureMockMvc(addFilters = false)
class MemberControllerTest {

    @Autowired private MockMvc mockMvc;

    private final ObjectMapper objectMapper =
            new ObjectMapper().findAndRegisterModules();

    @MockitoBean private MemberService memberService;
    @MockitoBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean private SystemConfigService systemConfigService;

    @Test
    void searchMembers_ValidRequest_Returns200() throws Exception {
        MemberResponse response = MemberResponse.builder()
                .id(1L)
                .fullName("Nguyễn Văn Test")
                .dateOfBirth(LocalDate.of(2000, 1, 1))
                .email("test@example.com")
                .isVerified(true)
                .build();

        when(memberService.searchMembers(
                "Nguyễn", null, null, null, null, null, null, true, 0, 10))
                .thenReturn(new PageImpl<>(List.of(response)));

        mockMvc.perform(get("/api/members")
                        .param("name", "Nguyễn")
                        .param("isVerified", "true")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].fullName").value("Nguyễn Văn Test"));
    }

    @Test
    void createMember_ValidRequest_Returns200() throws Exception {
        MemberRequest request = new MemberRequest();
        request.setFullName("Nguyễn Văn Test");
        request.setDateOfBirth("2000/01/01");
        request.setPhoneNumber("0901234567");
        request.setAddress("TP. Hồ Chí Minh");
        request.setUserId(10L);

        MemberResponse response = MemberResponse.builder()
                .id(1L)
                .fullName("Nguyễn Văn Test")
                .dateOfBirth(LocalDate.of(2000, 1, 1))
                .build();

        when(memberService.createMember(any(MemberRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn Test"));
    }

    @Test
    void createMember_MissingFullName_Returns400() throws Exception {
        MemberRequest request = new MemberRequest();
        request.setDateOfBirth("2000/01/01");

        mockMvc.perform(post("/api/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Dữ liệu không hợp lệ"))
                .andExpect(jsonPath("$.fieldErrors.fullName")
                        .value("Họ tên không được để trống"));
    }

    @Test
    void updateMember_ValidRequest_Returns200() throws Exception {
        MemberRequest request = new MemberRequest();
        request.setFullName("Nguyễn Văn Updated");
        request.setDateOfBirth("2001/02/03");
        request.setPhoneNumber("0901234567");
        request.setAddress("TP. Hồ Chí Minh");

        MemberResponse response = MemberResponse.builder()
                .id(1L)
                .fullName("Nguyễn Văn Updated")
                .dateOfBirth(LocalDate.of(2001, 2, 3))
                .build();

        when(memberService.updateMember(anyLong(), any(MemberRequest.class)))
                .thenReturn(response);

        mockMvc.perform(put("/api/members/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn Updated"));
    }

    @Test
    void deleteMember_ValidId_Returns200() throws Exception {
        doNothing().when(memberService).deleteMember(1L);

        mockMvc.perform(delete("/api/members/1"))
                .andExpect(status().isOk())
                .andExpect(content().string("Đã chuyển độc giả vào thùng rác!"));

        verify(memberService).deleteMember(1L);
    }
}
