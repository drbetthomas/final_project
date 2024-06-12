document.addEventListener('DOMContentLoaded', function() {
    const jobs = [
        { title: 'Clean my house', description: 'Need someone to clean my 2-bedroom apartment.' },
        { title: 'Move furniture', description: 'Help needed to move furniture to a new location.' },
        { title: 'Grocery shopping', description: 'Looking for someone to do my weekly grocery shopping.' },
        // Add more job items as needed
    ];

    const jobList = document.getElementById('job-list');

    function displayJobs(jobsToDisplay) {
        jobList.innerHTML = '';
        jobsToDisplay.forEach(job => {
            const jobItem = document.createElement('div');
            jobItem.className = 'job-item';
            jobItem.innerHTML = `
                <h2>${job.title}</h2>
                <p>${job.description}</p>
                <button onclick="applyForJob('${job.title}')">Apply</button>
            `;
            jobList.appendChild(jobItem);
        });
    }

    displayJobs(jobs);

    window.searchJobs = function() {
        const searchTerm = document.getElementById('search').value.toLowerCase();
        const filteredJobs = jobs.filter(job => 
            job.title.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm)
        );
        displayJobs(filteredJobs);
    };

    window.applyForJob = function(jobTitle) {
        alert(`You have applied for the job: ${jobTitle}`);
        // Here you can add code to handle the application process
    };
});
