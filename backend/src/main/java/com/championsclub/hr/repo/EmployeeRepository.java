package com.championsclub.hr.repo;

import com.championsclub.hr.domain.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    Optional<Employee> findByUserId(UUID userId);

    Optional<Employee> findByEmpNo(String empNo);

    List<Employee> findByIsDeletedFalseOrderByCreatedAtAsc();

    List<Employee> findByDepartmentAndIsDeletedFalse(String department);

    boolean existsByUserId(UUID userId);

    boolean existsByEmpNo(String empNo);

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.status = 'ACTIVE' AND e.isDeleted = false")
    long countActiveEmployees();
}
