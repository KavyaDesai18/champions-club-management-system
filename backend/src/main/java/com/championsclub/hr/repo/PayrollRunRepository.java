package com.championsclub.hr.repo;

import com.championsclub.hr.domain.PayrollRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayrollRunRepository extends JpaRepository<PayrollRun, UUID> {

    Optional<PayrollRun> findByYearAndMonth(int year, int month);

    List<PayrollRun> findAllByOrderByYearDescMonthDesc();

    boolean existsByYearAndMonth(int year, int month);
}
