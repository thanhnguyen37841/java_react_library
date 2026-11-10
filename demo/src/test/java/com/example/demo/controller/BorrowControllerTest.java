
package com.example.demo.controller;

import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.response.BorrowResponse;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.service.BorrowService;
import com.example.demo.service.MemberService;
import com.example.demo.service.SystemConfigService;
import com.example.demo.support.TestDataFactory;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BorrowController.class)
@AutoConfigureMockMvc(addFilters = false)
class BorrowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper =
            new ObjectMapper().findAndRegisterModules();

    @MockitoBean
    private BorrowService borrowService;

    @MockitoBean
    private MemberService memberService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private SystemConfigService systemConfigService;

    @Test
    void borrowBook_ValidRequest_Returns200() throws Exception {
        BorrowRequest request =
                TestDataFactory.createBorrowRequest(1L, 100L);

        BorrowResponse response = BorrowResponse.builder()
                .id(10L)
                .memberName("Nguyễn Văn Test")
                .bookTitle("Clean Code")
                .status(BorrowStatus.BORROWING)
                .build();

        when(borrowService.borrowBook(any(BorrowRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/borrows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.memberName").value("Nguyễn Văn Test"))
                .andExpect(jsonPath("$.bookTitle").value("Clean Code"))
                .andExpect(jsonPath("$.status").value("BORROWING"));
    }

    @Test
    void borrowBook_MissingBookId_Returns400() throws Exception {
        BorrowRequest request = new BorrowRequest();
        request.setMemberId(1L);

        mockMvc.perform(post("/api/borrows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Dữ liệu không hợp lệ"))
                .andExpect(jsonPath("$.fieldErrors.bookId")
                        .value("ID của Sách không được để trống"));
    }

    @Test
    void borrowBook_BusinessRuleViolation_Returns409() throws Exception {
        BorrowRequest request =
                TestDataFactory.createBorrowRequest(1L, 100L);

        when(borrowService.borrowBook(any(BorrowRequest.class)))
                .thenThrow(new IllegalStateException("Sách này đã hết trên kệ!"));

        mockMvc.perform(post("/api/borrows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("Sách này đã hết trên kệ!"));
    }

    @Test
    void returnBook_ValidId_Returns200() throws Exception {
        BorrowResponse response = BorrowResponse.builder()
                .id(10L)
                .memberName("Nguyễn Văn Test")
                .bookTitle("Clean Code")
                .status(BorrowStatus.RETURNED)
                .build();

        when(borrowService.returnBook(10L)).thenReturn(response);

        mockMvc.perform(put("/api/borrows/10/return"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.status").value("RETURNED"));
    }

    @Test
    void returnBook_NotFound_Returns404() throws Exception {
        when(borrowService.returnBook(anyLong()))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy phiếu mượn này"));

        mockMvc.perform(put("/api/borrows/999/return"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message")
                        .value("Không tìm thấy phiếu mượn này"));
    }
}