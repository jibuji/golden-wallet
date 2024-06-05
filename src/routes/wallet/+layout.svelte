
<div class="container">
	<div class="nav-bar">
		<a href="/wallet">Overview</a>
		<a href="/wallet/send">Send</a>
		<a href="/wallet/receive">Receive</a>
		<a href="/wallet/transactions">Transactions</a>
	</div>

	<div class="main-content">
		<slot></slot>
	</div>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		padding: 10px;
		font-family: Arial, sans-serif;
		color: #333;
		height: 100%;
	}

	.nav-bar {
		display: flex;
		justify-content: space-around;
		background-color: #f8f8f8;
		padding: 10px;
		border-bottom: 1px solid #e0e0e0;
		border-radius: 5px;
		margin-bottom: 20px;
	}

	.nav-bar a {
		text-decoration: none;
		color: #333;
		font-weight: bold;
	}

	.main-content {
		display: flex;
		justify-content: space-between;
		margin-top: 20px;
	}

</style>
