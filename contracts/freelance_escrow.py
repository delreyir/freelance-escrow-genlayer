# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing
from datetime import datetime, timezone


class FreelanceEscrow(gl.Contract):
    job_count: i32
    jobs: TreeMap[str, str]  # job_id -> JSON encoded job data
    ratings: TreeMap[str, str]  # address -> JSON {total_score, count}

    def __init__(self):
        self.job_count = i32(0)

    @gl.public.write.payable
    def create_job(self, title: str, description: str, requirements: str, deadline_hours: i32) -> i32:
        value = gl.message.value
        if value == u256(0):
            raise gl.vm.UserError("Must send payment for escrow")
        if int(deadline_hours) < 1:
            raise gl.vm.UserError("Deadline must be at least 1 hour")

        self.job_count = i32(int(self.job_count) + 1)
        job_id = str(int(self.job_count))
        now = int(datetime.now(timezone.utc).timestamp())

        job = {
            "id": job_id,
            "client": str(gl.message.sender_address),
            "freelancer": "",
            "title": title,
            "description": description,
            "requirements": requirements,
            "amount": str(value),
            "status": 0,
            "deliverable": "",
            "dispute_reason": "",
            "resolution": "",
            "created_at": now,
            "deadline": now + (int(deadline_hours) * 3600),
            "client_rating": 0,
            "freelancer_rating": 0,
        }
        self.jobs[job_id] = json.dumps(job)
        return self.job_count

    @gl.public.write
    def accept_job(self, job_id: str) -> None:
        job = json.loads(self.jobs[job_id])
        if job["status"] != 0:
            raise gl.vm.UserError("Job not open")
        if str(gl.message.sender_address) == job["client"]:
            raise gl.vm.UserError("Client cannot accept own job")

        job["freelancer"] = str(gl.message.sender_address)
        job["status"] = 1
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def submit_deliverable(self, job_id: str, deliverable: str) -> None:
        job = json.loads(self.jobs[job_id])
        if job["status"] != 1:
            raise gl.vm.UserError("Job not in progress")
        if str(gl.message.sender_address) != job["freelancer"]:
            raise gl.vm.UserError("Only freelancer can submit")
        now = int(datetime.now(timezone.utc).timestamp())
        if now > job["deadline"]:
            raise gl.vm.UserError("Deadline has passed")

        job["deliverable"] = deliverable
        job["status"] = 2
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def approve_deliverable(self, job_id: str) -> None:
        job = json.loads(self.jobs[job_id])
        if job["status"] != 2:
            raise gl.vm.UserError("No deliverable to approve")
        if str(gl.message.sender_address) != job["client"]:
            raise gl.vm.UserError("Only client can approve")

        job["status"] = 4
        self.jobs[job_id] = json.dumps(job)
        # Pay freelancer
        self._pay(job["freelancer"], u256(int(job["amount"])))

    @gl.public.write
    def raise_dispute(self, job_id: str, reason: str) -> None:
        job = json.loads(self.jobs[job_id])
        if job["status"] != 2:
            raise gl.vm.UserError("Can only dispute submitted work")
        if str(gl.message.sender_address) != job["client"]:
            raise gl.vm.UserError("Only client can dispute")

        job["status"] = 3
        job["dispute_reason"] = reason
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def resolve_dispute(self, job_id: str) -> typing.Any:
        job = json.loads(self.jobs[job_id])
        if job["status"] != 3:
            raise gl.vm.UserError("Job not in dispute")

        def leader_fn():
            prompt = f"""You are an AI arbitrator for a freelance job dispute.

JOB TITLE: {job['title']}
JOB DESCRIPTION: {job['description']}
REQUIREMENTS: {job['requirements']}
DELIVERABLE SUBMITTED: {job['deliverable']}
CLIENT'S DISPUTE REASON: {job['dispute_reason']}

Evaluate whether the deliverable meets the job requirements.
Consider:
1. Does the deliverable address the core requirements?
2. Is the client's dispute reason valid?
3. What is a fair resolution?

Return JSON:
{{
    "decision": "freelancer" or "client" or "split",
    "reasoning": "brief explanation",
    "freelancer_percent": 0-100
}}"""
            response = gl.nondet.exec_prompt(prompt)
            return json.loads(response)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            validator_data = leader_fn()
            leader_data = leader_result.calldata
            # Decision must match
            if leader_data["decision"] != validator_data["decision"]:
                return False
            # Freelancer percent within 10% tolerance
            return abs(leader_data["freelancer_percent"] - validator_data["freelancer_percent"]) <= 10

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        amount = u256(int(job["amount"]))
        freelancer_pct = result["freelancer_percent"]
        freelancer_amount = u256((int(amount) * freelancer_pct) // 100)
        client_amount = u256(int(amount) - int(freelancer_amount))

        if int(freelancer_amount) > 0:
            self._pay(job["freelancer"], freelancer_amount)
        if int(client_amount) > 0:
            self._pay(job["client"], client_amount)

        job["status"] = 4
        job["resolution"] = json.dumps(result)
        self.jobs[job_id] = json.dumps(job)

    @gl.public.view
    def get_job(self, job_id: str) -> str:
        return self.jobs[job_id]

    @gl.public.view
    def get_job_count(self) -> i32:
        return self.job_count

    @gl.public.write
    def cancel_job(self, job_id: str) -> None:
        job = json.loads(self.jobs[job_id])
        if str(gl.message.sender_address) != job["client"]:
            raise gl.vm.UserError("Only client can cancel")
        if job["status"] != 0:
            raise gl.vm.UserError("Can only cancel open jobs")

        job["status"] = 5
        self.jobs[job_id] = json.dumps(job)
        self._pay(job["client"], u256(int(job["amount"])))

    @gl.public.write
    def claim_expired(self, job_id: str) -> None:
        """Client can reclaim escrow if deadline passed with no submission."""
        job = json.loads(self.jobs[job_id])
        if job["status"] != 1:
            raise gl.vm.UserError("Job not in progress")
        now = int(datetime.now(timezone.utc).timestamp())
        if now <= job["deadline"]:
            raise gl.vm.UserError("Deadline not yet passed")

        job["status"] = 5
        self.jobs[job_id] = json.dumps(job)
        self._pay(job["client"], u256(int(job["amount"])))

    @gl.public.write
    def rate_freelancer(self, job_id: str, score: i32) -> None:
        if int(score) < 1 or int(score) > 5:
            raise gl.vm.UserError("Score must be 1-5")
        job = json.loads(self.jobs[job_id])
        if job["status"] != 4:
            raise gl.vm.UserError("Job not completed")
        if str(gl.message.sender_address) != job["client"]:
            raise gl.vm.UserError("Only client can rate freelancer")
        if job["freelancer_rating"] != 0:
            raise gl.vm.UserError("Already rated")

        job["freelancer_rating"] = int(score)
        self.jobs[job_id] = json.dumps(job)
        self._update_rating(job["freelancer"], int(score))

    @gl.public.write
    def rate_client(self, job_id: str, score: i32) -> None:
        if int(score) < 1 or int(score) > 5:
            raise gl.vm.UserError("Score must be 1-5")
        job = json.loads(self.jobs[job_id])
        if job["status"] != 4:
            raise gl.vm.UserError("Job not completed")
        if str(gl.message.sender_address) != job["freelancer"]:
            raise gl.vm.UserError("Only freelancer can rate client")
        if job["client_rating"] != 0:
            raise gl.vm.UserError("Already rated")

        job["client_rating"] = int(score)
        self.jobs[job_id] = json.dumps(job)
        self._update_rating(job["client"], int(score))

    @gl.public.view
    def get_rating(self, address: str) -> str:
        try:
            return self.ratings[address]
        except Exception:
            return json.dumps({"total_score": 0, "count": 0, "average": 0})

    def _update_rating(self, address: str, score) -> None:
        try:
            data = json.loads(self.ratings[address])
        except Exception:
            data = {"total_score": 0, "count": 0}
        data["total_score"] += score
        data["count"] += 1
        data["average"] = round(data["total_score"] / data["count"], 1)
        self.ratings[address] = json.dumps(data)

    def _pay(self, recipient: str, amount: u256) -> None:
        @gl.evm.contract_interface
        class _Recipient:
            class View:
                pass
            class Write:
                pass
        _Recipient(Address(recipient)).emit_transfer(value=amount)
