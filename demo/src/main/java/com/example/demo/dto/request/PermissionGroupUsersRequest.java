
package com.example.demo.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class PermissionGroupUsersRequest {

    @NotEmpty(message = "Danh sách tài khoản không được để trống")
    private Set<Long> userIds;
}
