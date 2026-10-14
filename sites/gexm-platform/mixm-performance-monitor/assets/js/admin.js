(function($) {
    'use strict';
    
    var responseTimeChart = null;
    var memoryChart = null;
    var queryChart = null;
    
    function fetchHistoryData(period) {
        $.ajax({
            url: mixmPerfMonitor.restUrl + 'mixm/v1/performance/history',
            type: 'GET',
            data: { period: period },
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-WP-Nonce', mixmPerfMonitor.nonce);
            },
            success: function(response) {
                if (response.success && response.data) {
                    renderCharts(response.data);
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to fetch history data:', error);
            }
        });
    }
    
    function renderCharts(data) {
        var labels = data.map(function(item) {
            return item.time_slot;
        });
        
        var responseTimeData = data.map(function(item) {
            return parseFloat(item.avg_response_time);
        });
        
        var memoryData = data.map(function(item) {
            return parseFloat(item.avg_memory_usage) / 1024 / 1024;
        });
        
        var queryCountData = data.map(function(item) {
            return parseFloat(item.avg_query_count);
        });
        
        var queryTimeData = data.map(function(item) {
            return parseFloat(item.avg_query_time);
        });
        
        if (responseTimeChart) {
            responseTimeChart.destroy();
        }
        
        if (memoryChart) {
            memoryChart.destroy();
        }
        
        if (queryChart) {
            queryChart.destroy();
        }
        
        var responseTimeCtx = document.getElementById('mixmResponseTimeChart').getContext('2d');
        responseTimeChart = new Chart(responseTimeCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '平均响应时间 (秒)',
                    data: responseTimeData,
                    borderColor: '#0073aa',
                    backgroundColor: 'rgba(0, 115, 170, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '秒'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
        
        var memoryCtx = document.getElementById('mixmMemoryChart').getContext('2d');
        memoryChart = new Chart(memoryCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '平均内存使用 (MB)',
                    data: memoryData,
                    borderColor: '#46b450',
                    backgroundColor: 'rgba(70, 180, 80, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'MB'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
        
        var queryCtx = document.getElementById('mixmQueryChart').getContext('2d');
        queryChart = new Chart(queryCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '查询次数',
                    data: queryCountData,
                    backgroundColor: 'rgba(255, 185, 0, 0.7)',
                    borderColor: '#ffb900',
                    borderWidth: 1
                }, {
                    label: '查询耗时 (秒)',
                    data: queryTimeData,
                    backgroundColor: 'rgba(220, 50, 50, 0.7)',
                    borderColor: '#dc3232',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }
    
    $(document).ready(function() {
        if ($('.mixm-period-tabs').length > 0) {
            fetchHistoryData('1h');
            
            $('.mixm-period-tab').on('click', function() {
                $('.mixm-period-tab').removeClass('active');
                $(this).addClass('active');
                
                var period = $(this).data('period');
                fetchHistoryData(period);
            });
        }
    });
})(jQuery);
